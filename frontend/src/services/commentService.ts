export interface Comment {
  id: string;
  marketAddress: string;
  author: string;
  authorUsername: string;
  content: string;
  timestamp: number;
}

const STORAGE_KEY = 'sora_market_comments';

export class CommentService {
  private static getComments(): Comment[] {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  private static saveComments(comments: Comment[]): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(comments));
  }

  static getMarketComments(marketAddress: string): Comment[] {
    const comments = this.getComments();
    return comments
      .filter(c => c.marketAddress.toLowerCase() === marketAddress.toLowerCase())
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  static addComment(marketAddress: string, author: string, authorUsername: string, content: string): Comment {
    const comments = this.getComments();
    const comment: Comment = {
      id: `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      marketAddress: marketAddress.toLowerCase(),
      author: author.toLowerCase(),
      authorUsername,
      content,
      timestamp: Date.now()
    };
    comments.push(comment);
    this.saveComments(comments);
    return comment;
  }

  static deleteComment(commentId: string, userAddress: string): boolean {
    const comments = this.getComments();
    const index = comments.findIndex(c => c.id === commentId && c.author.toLowerCase() === userAddress.toLowerCase());
    if (index === -1) return false;
    
    comments.splice(index, 1);
    this.saveComments(comments);
    return true;
  }
}
