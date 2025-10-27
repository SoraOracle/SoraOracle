import { Contract, Provider, Signer, formatEther, parseEther, EventLog } from 'ethers';
import { 
  Question, 
  Answer, 
  QuestionWithAnswer, 
  AnswerType, 
  SoraConfig, 
  TransactionOptions,
  EventFilter,
  BatchQuestionRequest 
} from '../types';
import { SORA_ORACLE_ABI } from '../utils/abis';
import { parseQuestionEvent, parseAnswerEvent } from '../utils/parsers';

export class SoraOracleClient {
  private contract: Contract;
  private provider: Provider;
  private signer?: Signer;
  public readonly address: string;

  constructor(config: SoraConfig, signerOrProvider: Signer | Provider) {
    this.address = config.soraOracleAddress;
    
    if ('getAddress' in signerOrProvider) {
      this.signer = signerOrProvider as Signer;
      this.provider = signerOrProvider.provider!;
    } else {
      this.provider = signerOrProvider as Provider;
    }
    
    this.contract = new Contract(
      config.soraOracleAddress,
      SORA_ORACLE_ABI,
      this.signer || this.provider
    );
  }

  /**
   * Ask a general question to the oracle
   */
  async askGeneralQuestion(question: string, options?: TransactionOptions): Promise<string> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const questionFee = await this.contract.questionFee();
    const tx = await this.contract.askGeneralQuestion(question, {
      value: questionFee,
      ...options
    });
    
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => 
      log.fragment && log.fragment.name === 'QuestionAsked'
    ) as EventLog;
    
    return event?.args?.questionId || '';
  }

  /**
   * Ask a yes/no question to the oracle
   */
  async askYesNoQuestion(question: string, options?: TransactionOptions): Promise<string> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const questionFee = await this.contract.questionFee();
    const tx = await this.contract.askYesNoQuestion(question, {
      value: questionFee,
      ...options
    });
    
    const receipt = await tx.wait();
    const event = receipt.logs.find((log: any) => 
      log.fragment && log.fragment.name === 'QuestionAsked'
    ) as EventLog;
    
    return event?.args?.questionId || '';
  }

  /**
   * Get question details with answer if available
   */
  async getQuestion(questionId: string): Promise<QuestionWithAnswer | null> {
    try {
      const result = await this.contract.getQuestionWithAnswer(questionId);
      
      const question: QuestionWithAnswer = {
        id: questionId,
        hash: result[0],
        asker: result[1],
        bounty: result[2],
        answerType: Number(result[3]),
        timestamp: Number(result[4]),
        answered: result[5]
      };

      if (result[5]) {
        question.answer = {
          textAnswer: result[6],
          numericAnswer: result[7],
          boolAnswer: result[8],
          confidenceScore: Number(result[9]),
          dataSource: result[10],
          timestamp: Number(result[11]),
          provider: result[12]
        };
      }

      return question;
    } catch (error) {
      console.error('Error fetching question:', error);
      return null;
    }
  }

  /**
   * Provide an answer to a question (oracle provider only)
   */
  async provideAnswer(
    questionId: string,
    textAnswer: string,
    numericAnswer: bigint,
    boolAnswer: boolean,
    confidenceScore: number,
    dataSource: string,
    options?: TransactionOptions
  ): Promise<void> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const tx = await this.contract.provideAnswer(
      questionId,
      textAnswer,
      numericAnswer,
      boolAnswer,
      confidenceScore,
      dataSource,
      options
    );
    
    await tx.wait();
  }

  /**
   * Refund unanswered question after 7 days
   */
  async refund(questionId: string, options?: TransactionOptions): Promise<void> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const tx = await this.contract.refund(questionId, options);
    await tx.wait();
  }

  /**
   * Withdraw provider earnings (oracle provider only)
   */
  async withdraw(options?: TransactionOptions): Promise<void> {
    if (!this.signer) throw new Error('Signer required for this operation');
    
    const tx = await this.contract.withdraw(options);
    await tx.wait();
  }

  /**
   * Get provider balance
   */
  async getProviderBalance(provider: string): Promise<bigint> {
    return await this.contract.providerBalance(provider);
  }

  /**
   * Get question fee
   */
  async getQuestionFee(): Promise<bigint> {
    return await this.contract.questionFee();
  }

  /**
   * Listen to QuestionAsked events
   */
  onQuestionAsked(callback: (question: Question) => void, filter?: EventFilter): void {
    const eventFilter = this.contract.filters.QuestionAsked();
    
    this.contract.on(eventFilter, (questionId, questionHash, asker, answerType, bounty, event) => {
      callback({
        id: questionId,
        hash: questionHash,
        asker,
        bounty,
        answerType: Number(answerType),
        timestamp: Date.now() / 1000,
        answered: false
      });
    });
  }

  /**
   * Listen to AnswerProvided events
   */
  onAnswerProvided(callback: (questionId: string, answer: Answer) => void, filter?: EventFilter): void {
    const eventFilter = this.contract.filters.AnswerProvided();
    
    this.contract.on(eventFilter, (
      questionId, 
      textAnswer, 
      numericAnswer, 
      boolAnswer, 
      confidenceScore, 
      dataSource, 
      provider, 
      event
    ) => {
      callback(questionId, {
        textAnswer,
        numericAnswer,
        boolAnswer,
        confidenceScore: Number(confidenceScore),
        dataSource,
        timestamp: Date.now() / 1000,
        provider
      });
    });
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners(): void {
    this.contract.removeAllListeners();
  }
}
