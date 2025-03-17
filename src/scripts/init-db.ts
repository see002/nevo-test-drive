import { initDb, insertSampleData } from '@/server/db';

// Run initialization
console.log('Initializing database...');
initDb();
console.log('Inserting sample data...');
insertSampleData();
console.log('Database setup complete!'); 