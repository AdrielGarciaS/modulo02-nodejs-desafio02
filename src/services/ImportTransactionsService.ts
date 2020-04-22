import { getCustomRepository, getRepository, In } from 'typeorm';
import path from 'path';
import fs from 'fs';
import csvParse from 'csv-parse';
import AppError from '../errors/AppError';
import uploadConfig from '../config/upload';

import TransactionRepository from '../repositories/TransactionsRepository';
import Category from '../models/Category';
import Transaction from '../models/Transaction';

interface CSVTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

interface Request {
  filename: string;
}

class ImportTransactionsService {
  async execute({ filename }: Request): Promise<void> {
    const transactionsRepository = getCustomRepository(TransactionRepository);
    const categoriesRepository = getRepository(Category);

    const fileTransactionsPath = path.join(uploadConfig.directory, filename);

    const [, extension] = filename.split('.');

    if (extension.toLowerCase() !== 'csv') {
      await fs.promises.unlink(fileTransactionsPath);
      throw new AppError("The file's extension must be .csv");
    }

    const contactsReadStream = fs.createReadStream(fileTransactionsPath);

    const parser = csvParse({
      from_line: 2,
    });

    const parseCSV = contactsReadStream.pipe(parser);

    const transactions: CSVTransaction[] = [];
    const categories: string[] = [];

    parseCSV.on('data', async line => {
      const [title, type, value, category] = line.map((cell: string) =>
        cell.trim(),
      );

      if (!title || !type || !value) return;

      categories.push(category);

      transactions.push({ title, type, value, category });
    });

    await new Promise(resolve => parseCSV.on('end', resolve));

    const existentCategories = await categoriesRepository.find({
      where: {
        title: In(categories),
      },
    });

    const existentCategoriesTitle = existentCategories.map(
      (category: Category) => category.title,
    );

    const addCategoryTitles = categories
      .filter(category => !existentCategoriesTitle.includes(category))
      .filter((title, index, selfArray) => selfArray.indexOf(title) === index);

    const newCategories = categoriesRepository.create(
      addCategoryTitles.map(title => ({
        title,
      })),
    );

    await categoriesRepository.save(newCategories);

    const allCategories = [...newCategories, ...existentCategories];

    const createdTransactions = transactionsRepository.create(
      transactions.map(({ title, category, value, type }) => ({
        title,
        value,
        type,
        category_id: allCategories.find(cat => cat.title === category)!.id,
      })),
    );

    await transactionsRepository.save(createdTransactions);

    await fs.promises.unlink(fileTransactionsPath);
  }
}

export default ImportTransactionsService;
