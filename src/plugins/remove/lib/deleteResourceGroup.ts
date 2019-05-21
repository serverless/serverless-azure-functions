export function deleteResourceGroup(): Promise<any> {
  return this.provider.Login()
    .then(() => this.provider.DeleteDeployment())
    .then(() => this.provider.DeleteResourceGroup());
}
