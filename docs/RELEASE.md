# Releasing new version

## Beta development

This is the instruction on how to release new beta packages on the `dev` branch

### Steps

1. Check out `dev`
1. Pull latest
1. Run script to bump versiona and push changes to new branch `npmRelease`

    ```bash
    ./scripts/npmVersionBumpPrerelease.sh
    ```

1. Open PR, get reviews
1. Merge PR
1. Check out `dev`
1. Run script

   ```bash
   scripts/tagBranchForRelease.sh
   ```

1. Travis will automatically release to npm
