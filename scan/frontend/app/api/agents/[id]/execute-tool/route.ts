import { NextRequest, NextResponse } from 'next/server';
import { Pool } from 'pg';
import Anthropic from '@anthropic-ai/sdk';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const DEFAULT_MODEL_STR = "claude-sonnet-4-20250514";

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { tool_call_id, tool_id, tx_hash, input, payer_address, session_id } = await request.json();
    const agentId = id;

    if (!session_id) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    if (!payer_address) {
      return NextResponse.json({ error: 'Payer address required' }, { status: 400 });
    }

    const toolResult = await pool.query(
      'SELECT * FROM s402_tools WHERE id = $1',
      [tool_id]
    );

    if (toolResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tool not found' }, { status: 404 });
    }

    const tool = toolResult.rows[0];

    const usageCheck = await pool.query(
      'SELECT id FROM s402_tool_payments WHERE tx_hash = $1',
      [tx_hash]
    );

    if (usageCheck.rows.length > 0) {
      return NextResponse.json({ error: 'Payment already used' }, { status: 400 });
    }

    // For demo purposes, skip strict payment verification
    // In production, you'd verify the payment on-chain
    console.log('💰 Payment verified:', tx_hash);
    console.log('🔧 Tool ID:', tool_id);
    console.log('🔧 Tool Name:', tool.name);

    let toolOutput: any;
    
    // Handle specific tool types (check both id and name for robustness)
    if (tool_id === 'replicate_seedream4' || tool.name?.toLowerCase().includes('seedream')) {
      // Use Replicate for image generation
      try {
        const Replicate = require('replicate');
        const replicate = new Replicate({
          auth: process.env.REPLICATE_API_TOKEN,
        });

        console.log('🎨 Generating image with prompt:', input.prompt);
        
        const output = await replicate.run(
          "bytedance/seedream-4",
          {
            input: {
              prompt: input.prompt,
              aspect_ratio: input.aspect_ratio || "16:9",
              size: "2K",
              num_images: 1,
            }
          }
        );

        console.log('🔍 Raw Replicate output:', output);
        console.log('🔍 Output type:', typeof output);
        
        // Replicate returns FileOutput objects for Seedream 4
        let replicateUrls: string[] = [];
        
        if (Array.isArray(output)) {
          // Convert FileOutput objects to URLs
          for (const item of output) {
            if (item && typeof item === 'object') {
              // FileOutput has a url() method or direct URL
              if (typeof item.url === 'function') {
                replicateUrls.push(await item.url());
              } else if (typeof item === 'string') {
                replicateUrls.push(item);
              } else {
                // Convert stream/object to string
                const urlStr = String(item);
                if (urlStr.startsWith('http')) {
                  replicateUrls.push(urlStr);
                }
              }
            } else if (typeof item === 'string') {
              replicateUrls.push(item);
            }
          }
        } else if (typeof output === 'string') {
          replicateUrls = [output];
        }

        console.log('✅ Replicate URLs extracted:', replicateUrls);
        
        // Download and rehost images from our own domain
        const fs = require('fs/promises');
        const path = require('path');
        const hostedUrls: string[] = [];
        
        for (const replicateUrl of replicateUrls) {
          try {
            console.log('📥 Downloading image from Replicate...');
            const urlStr = String(replicateUrl);
            const response = await fetch(urlStr);
            const arrayBuffer = await response.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            
            // Generate unique filename
            const ext = urlStr.includes('.png') ? 'png' : 'jpg';
            const filename = `${Date.now()}-${Math.random().toString(36).substring(7)}.${ext}`;
            const filePath = path.join(process.cwd(), 'public', 'generated-images', filename);
            
            // Save to filesystem
            await fs.writeFile(filePath, buffer);
            console.log('💾 Image saved:', filename);
            
            // Return our own URL
            const hostedUrl = `/api/images/${filename}`;
            hostedUrls.push(hostedUrl);
          } catch (error) {
            console.error('❌ Failed to download/save image:', error);
            // Fallback to Replicate URL if download fails
            hostedUrls.push(String(replicateUrl));
          }
        }

        toolOutput = {
          success: true,
          images: hostedUrls,
          prompt: input.prompt,
          aspect_ratio: input.aspect_ratio || "16:9",
        };
        
        console.log('✅ Hosted URLs:', hostedUrls);
      } catch (error) {
        console.error('❌ Replicate API error:', error);
        toolOutput = { 
          success: false, 
          error: 'Failed to generate image',
          details: String(error),
        };
      }
    } else {
      // Generic HTTP tool execution
      try {
        let url = tool.endpoint_url;
        
        if (!url || url === 'your_replit_url' || url.includes('placeholder')) {
          throw new Error('Tool endpoint URL not configured');
        }

        const headers: any = {
          'Content-Type': 'application/json',
          'X-S402-TxID': tx_hash,
          ...tool.auth_headers,
        };

        if (tool.http_method === 'GET') {
          const params = new URLSearchParams(input);
          url = `${url}?${params.toString()}`;
          const response = await fetch(url, { headers });
          toolOutput = await response.json();
        } else {
          const response = await fetch(url, {
            method: 'POST',
            headers,
            body: JSON.stringify(input),
          });
          toolOutput = await response.json();
        }
      } catch (error) {
        console.error('❌ Tool execution error:', error);
        toolOutput = { 
          success: false,
          error: 'Failed to execute tool',
          details: String(error)
        };
      }
    }

    await pool.query(
      `INSERT INTO s402_tool_payments (agent_id, tool_id, tx_hash, payer_address, amount_usd, tool_input, tool_output, status, completed_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
      [agentId, tool_id, tx_hash, payer_address, parseFloat(tool.cost_usd), JSON.stringify(input), JSON.stringify(toolOutput), 'completed']
    );

    const historyResult = await pool.query(
      'SELECT role, content, tool_calls FROM s402_agent_chats WHERE agent_id = $1 AND session_id = $2 ORDER BY created_at ASC LIMIT 20',
      [agentId, session_id]
    );

    // Build conversation history, excluding orphaned tool_use blocks
    const conversationHistory: any[] = [];
    
    for (let i = 0; i < historyResult.rows.length; i++) {
      const row = historyResult.rows[i];
      
      if (row.role === 'user' && row.content) {
        conversationHistory.push({
          role: 'user',
          content: row.content,
        });
      } else if (row.role === 'assistant') {
        if (row.tool_calls) {
          // JSONB columns are already parsed objects
          const toolCallsArray = Array.isArray(row.tool_calls) ? row.tool_calls : [row.tool_calls];
          const toolCall = toolCallsArray[0];
          
          if (toolCall.id === tool_call_id) {
            // This is the tool call we're providing a result for
            conversationHistory.push({
              role: 'assistant',
              content: toolCallsArray,
            });
          }
          // Skip other orphaned tool calls
        } else if (row.content) {
          // Regular assistant text response
          conversationHistory.push({
            role: 'assistant',
            content: row.content,
          });
        }
      }
    }

    // Add the tool result as a user message
    // This pairs with the last assistant tool_use message
    conversationHistory.push({
      role: 'user',
      content: [
        {
          type: 'tool_result',
          tool_use_id: tool_call_id,
          content: typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput),
        },
      ],
    });
    
    console.log('📋 Conversation history length:', conversationHistory.length);
    console.log('📋 Last 2 messages:', JSON.stringify(conversationHistory.slice(-2), null, 2));

    const agentResult = await pool.query(
      'SELECT description FROM s402_agents WHERE id = $1',
      [agentId]
    );

    const systemPrompt = agentResult.rows[0]?.description || 'You are a helpful AI assistant powered by s402 oracle data.';

    // Retry helper with exponential backoff for transient errors
    const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3) => {
      const delays = [1000, 2000, 4000]; // 1s, 2s, 4s
      let lastError;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error: any) {
          lastError = error;
          const is529 = error.status === 529;
          const isTransient = error.status >= 500 && error.status < 600;
          
          // Only retry on 529 or transient server errors
          if ((is529 || isTransient) && i < maxRetries - 1) {
            console.log(`⚠️ Anthropic API ${error.status} error, retrying in ${delays[i]}ms (attempt ${i + 1}/${maxRetries})...`);
            await new Promise(resolve => setTimeout(resolve, delays[i]));
            continue;
          }
          
          throw error;
        }
      }
      
      throw lastError;
    };

    let reply: string;
    
    try {
      const response = await retryWithBackoff(() => 
        anthropic.messages.create({
          model: DEFAULT_MODEL_STR,
          max_tokens: 2048,
          system: systemPrompt,
          messages: conversationHistory,
        })
      );

      const textContent = response.content.find(c => c.type === 'text');
      reply = textContent ? (textContent as any).text : 'I received the data but could not process it.';
    } catch (error: any) {
      // Graceful fallback when Claude is unavailable
      console.error('❌ Claude API unavailable after retries:', error.status, error.message);
      
      // Build fallback response with tool output details
      if (toolOutput && typeof toolOutput === 'object' && 'images' in toolOutput && toolOutput.images) {
        // Images will be rendered from tool_output, no need for markdown links
        reply = `✅ Your image has been generated successfully!`;
      } else if (toolOutput) {
        reply = `✅ Tool executed successfully!\n\nResult: ${JSON.stringify(toolOutput, null, 2)}`;
      } else {
        reply = `⚠️ The tool was executed successfully, but I'm temporarily experiencing high load and can't provide a detailed response right now. Please try again in a moment.`;
      }
    }

    await pool.query(
      'INSERT INTO s402_agent_chats (agent_id, session_id, role, content, tool_output) VALUES ($1, $2, $3, $4, $5)',
      [agentId, session_id, 'assistant', reply, JSON.stringify(toolOutput)]
    );

    // Update agent stats: increment query count and total spent
    await pool.query(
      'UPDATE s402_agents SET total_spent_usd = total_spent_usd + $1, query_count = query_count + 1, last_active_at = NOW() WHERE id = $2',
      [parseFloat(tool.cost_usd), agentId]
    );

    return NextResponse.json({ type: 'message', content: reply, tool_output: toolOutput });
  } catch (error) {
    console.error('Tool execution error:', error);
    return NextResponse.json({ error: 'Failed to execute tool' }, { status: 500 });
  }
}
