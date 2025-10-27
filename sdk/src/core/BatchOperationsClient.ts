import { Contract, Provider, Signer } from 'ethers';
import { SoraConfig, TransactionOptions, BatchQuestionRequest, BatchAnswerRequest, AnswerType } from '../types';
import { BATCH_OPERATIONS_ABI } from '../utils/abis';

export class BatchOperationsClient {
  private contract: Contract;
  private provider: Provider;
  private signer?: Signer;
  public readonly address: string;

  constructor(config: SoraConfig, signerOrProvider: Signer | Provider) {
    if (!config.batchOperationsAddress) {
      throw new Error('BatchOperations address not configured');
    }

    this.address = config.batchOperationsAddress;
    
    if ('getAddress' in signerOrProvider) {
      this.signer = signerOrProvider as Signer;
      this.provider = signerOrProvider.provider!;
    } else {
      this.provider = signerOrProvider as Provider;
    }
    
    this.contract = new Contract(
      config.batchOperationsAddress,
      BATCH_OPERATIONS_ABI,
      this.signer || this.provider
    );
  }

  /**
   * Ask multiple questions in a single transaction (up to 20)
   */
  async batchAskQuestions(
    requests: BatchQuestionRequest[],
    options?: TransactionOptions
  ): Promise<string[]> {
    if (!this.signer) throw new Error('Signer required for this operation');
    if (requests.length === 0 || requests.length > 20) {
      throw new Error('Must provide 1-20 questions');
    }

    const questions = requests.map(r => r.question);
    const answerTypes = requests.map(r => r.answerType);
    const questionFee = await this.contract.questionFee();
    const totalFee = questionFee * BigInt(requests.length);

    const tx = await this.contract.batchAskQuestions(questions, answerTypes, {
      value: totalFee,
      ...options
    });

    const receipt = await tx.wait();
    const questionIds: string[] = [];

    for (const log of receipt.logs) {
      if (log.fragment && log.fragment.name === 'QuestionAsked') {
        const event = log as any;
        questionIds.push(event.args.questionId);
      }
    }

    return questionIds;
  }

  /**
   * Provide answers to multiple questions in a single transaction
   */
  async batchProvideAnswers(
    answers: BatchAnswerRequest[],
    options?: TransactionOptions
  ): Promise<void> {
    if (!this.signer) throw new Error('Signer required for this operation');
    if (answers.length === 0 || answers.length > 20) {
      throw new Error('Must provide 1-20 answers');
    }

    const questionIds = answers.map(a => a.questionId);
    const textAnswers = answers.map(a => a.textAnswer);
    const numericAnswers = answers.map(a => a.numericAnswer);
    const boolAnswers = answers.map(a => a.boolAnswer);
    const confidenceScores = answers.map(a => a.confidenceScore);
    const dataSources = answers.map(a => a.dataSource);

    const tx = await this.contract.batchProvideAnswers(
      questionIds,
      textAnswers,
      numericAnswers,
      boolAnswers,
      confidenceScores,
      dataSources,
      options
    );

    await tx.wait();
  }

  /**
   * Check status of multiple questions
   */
  async batchCheckStatus(questionIds: string[]): Promise<boolean[]> {
    return await this.contract.batchCheckStatus(questionIds);
  }
}
