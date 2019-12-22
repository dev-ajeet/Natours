const mongoose = require('mongoose');
const dotenv = require('dotenv');

// we need to define this first as if any exception arises after this part of the code then system has to know where it have to throw the error as this function has been defined at the starting of the application.
process.on('uncaughtException', err => {
  console.log('uncaughtException: Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

dotenv.config({ path: './config.env' });
const app = require('./app');

const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

mongoose
  .connect(DB, {
    useNewUrlParser: true,
    useCreateIndex: true,
    useUnifiedTopology: true,
    useFindAndModify: false
  })
  .then(() => console.log('DB Connection successful'))
  .catch(error => console.log('DB Connection failed:', error.message));

const port = process.env.PORT || 3000;
const server = app.listen(port, () => {
  console.log(`App running on port ${port}`);
});

process.on('unhandledRejection', err => {
  console.log('unhandledRejection: Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

process.on('SIGTERM', () => {
  console.log('SIGTERM RECEIVED. SHUTTING DOWN GRACEFULLY');
  server.close(() => {
    console.log('Process terminated by SIGTERM');
  });
});
