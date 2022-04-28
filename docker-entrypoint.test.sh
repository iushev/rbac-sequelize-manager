echo "Migrating database ..."
node lib/cli.js migrate

echo "Executing tests ..."
npm run test:watch
