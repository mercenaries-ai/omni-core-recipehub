/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

import { run } from '../scripts/server/importRecipes.js';
const extensionHooks = {
    'server_loaded': async function(ctx, omniPackage, installationId, orgId, customBaseUrl, duration) {
      console.log('Server loaded:', omniPackage);
      console.log('Reconciling published recipes...')
      await run();  // Trigger the script to run when a package is installed
    }
  };

export default {hooks: extensionHooks}