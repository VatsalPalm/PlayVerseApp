const path = require('path');
const dotenv = require('/Users/mac/Projects/PlayVerse/PlayVerseNode/node_modules/dotenv');

dotenv.config({
  path: '/Users/mac/Projects/PlayVerse/PlayVerseNode/.env.db'
});
dotenv.config({
  path: '/Users/mac/Projects/PlayVerse/PlayVerseNode/.env.staging'
});

const { NestFactory } = require('/Users/mac/Projects/PlayVerse/PlayVerseNode/node_modules/@nestjs/core');
const { AppModule } = require('/Users/mac/Projects/PlayVerse/PlayVerseNode/dist/app.module');
const { MatchService } = require('/Users/mac/Projects/PlayVerse/PlayVerseNode/dist/module/match/match.service');
const { SQLService } = require('/Users/mac/Projects/PlayVerse/PlayVerseNode/dist/shared/services/sql.service');

// Monkey patch SQLService.runWithTransaction to print queries
const originalRunWithTransaction = SQLService.prototype.runWithTransaction;
SQLService.prototype.runWithTransaction = async function(queryRunner, query, parameters) {
  console.log('[Query]', query.query.trim().replace(/\s+/g, ' '));
  console.log('[Params]', JSON.stringify(parameters ?? query.parameters ?? null));
  try {
    const res = await originalRunWithTransaction.call(this, queryRunner, query, parameters);
    return res;
  } catch (err) {
    console.error('[Query Error]', err.message);
    throw err;
  }
};

async function run() {
  process.env.NODE_ENV = 'staging';
  try {
    const app = await NestFactory.createApplicationContext(AppModule);
    const matchService = app.get(MatchService);
    console.log('Running processRally...');
    const res = await matchService.processRally(47, 44, 2, 2, 1);
    console.log('Result:', res);
    await app.close();
  } catch (err) {
    console.error('Error caught in test script:');
    console.error(err);
  }
}

run();
