import { getCustomRepository } from 'typeorm';
import AppError from '../errors/AppError';

import Transaction from '../models/Transaction';
import TransactionsRepository from '../repositories/TransactionsRepository';

import CreateCategoryService from './CreateCategoryService';

interface Request {
  title: string;
  value: number;
  type: 'income' | 'outcome';
  category: string;
}

class CreateTransactionService {
  public async execute({
    title,
    category: categoryTitle,
    type,
    value,
  }: Request): Promise<Transaction> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const createCategory = new CreateCategoryService();

    if (type !== 'income' && type !== 'outcome') {
      throw new AppError('The transaction type needs to be income or outcome');
    }

    const { balance } = await transactionsRepository.getBalance();

    if (type === 'outcome') {
      if (balance.outcome + value > balance.income) {
        throw new AppError('The total outcomes can not be bigger than incomes');
      }
    }

    const category = await createCategory.execute({
      title: categoryTitle,
    });

    const transaction = transactionsRepository.create({
      title,
      type,
      value,
      category_id: category.id,
    });

    await transactionsRepository.save(transaction);

    transaction.category = category;

    return transaction;
  }
}

export default CreateTransactionService;
