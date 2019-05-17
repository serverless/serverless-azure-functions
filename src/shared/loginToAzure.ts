export default function loginToAzure () {
  this.serverless.cli.log('Logging in to Azure');

  return this.provider.Login();
};
