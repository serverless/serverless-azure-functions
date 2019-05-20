export default function CreateResourceGroupAndFunctionApp () {
  return this.provider.CreateResourceGroup()
    .then(() => this.provider.CreateFunctionApp());
};