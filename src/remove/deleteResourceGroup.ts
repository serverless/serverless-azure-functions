export default function deleteResourceGroup () {
  return this.provider.Login()
    .then(() => this.provider.DeleteDeployment())
    .then(() => this.provider.DeleteResourceGroup());
};