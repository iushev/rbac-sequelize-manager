echo "Migrating database ..."
node build/cli.js migrate

echo "Executing tests ..."
npm run test
