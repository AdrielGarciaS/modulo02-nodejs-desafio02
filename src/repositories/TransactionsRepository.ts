import { EntityRepository, Repository } from 'typeorm';

import Transaction from '../models/Transaction';

interface Balance {
  income: number;
  outcome: number;
  total: number;
}

interface Response {
  transactions: Transaction[];
  balance: Balance;
}

@EntityRepository(Transaction)
class TransactionsRepository extends Repository<Transaction> {
  public async getBalance(): Promise<Response> {
    const transactions = await this.find();

    const initialBalance: Balance = {
      income: 0,
      outcome: 0,
      total: 0,
    };

    const balance = transactions.reduce((acc, transaction) => {
      if (transaction.type === 'income') {
        acc.income += Number(transaction.value);
        acc.total += Number(transaction.value);
        return acc;
      }
      acc.outcome += Number(transaction.value);
      acc.total -= Number(transaction.value);
      return acc;
    }, initialBalance);

    return {
      transactions,
      balance,
    };
  }
}

export default TransactionsRepository;
