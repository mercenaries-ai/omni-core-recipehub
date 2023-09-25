const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('child_process');
const { v4 } = require('uuid');
const os = require('os');

const MONO_COLLECTION_ID = "legacyMonoCollection";
const platform = os.platform();

async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const project_abs_root = path.resolve(__dirname) + '/../../../../../';
const pocketDB_root_dir = '.local.bin'

const pocketbaseInstallPath = path.join(
    project_abs_root,
    pocketDB_root_dir,
    'pocketbase'
);

async function run() {
    const templateDir = path.join(__dirname, '../templates');
    const files = fs.readdirSync(templateDir);  

    // Excludes output
    const jsonFiles = files.filter(file => 
        path.extname(file).toLowerCase() === '.json'
    );    

    // Convert to wf format    
    let jsonArray = [];
    for(let file of jsonFiles) {
        let content = fs.readFileSync(path.join(templateDir, file));
        let doc = JSON.parse(content);
        doc['owner'] = '-----public-----';
        
        if(doc.id === '949b18eb-417d-49df-96d3-8aeb8fc15402' && doc['meta']['tags'].indexOf('system') === -1) {
            doc['meta']['tags'].push('system');
        }
        if (doc['meta']['tags'].indexOf('template') === -1) {
            doc['meta']['tags'].push('template');
        }
        doc['meta']['updated'] = Date.now();
        doc['publishedTo'] = [];
        doc['version'] = 'draft';
        doc['_id'] = `wf:${doc.id}`;
        jsonArray.push(doc);
    }

    await reconcilePublishedRecipes(jsonArray);
}
// move to config
function getExecutable() {
    switch (`${platform}`) {
        case "win32": return "pocketbase.exe";
        case "darwin": return "pocketbase";
        case "linux": return "pocketbase";
    }
    throw new Error("Unhandled executable type for " + platform);
}

async function reconcilePublishedRecipes(publishedRecipes) {
    let dbprocess = spawn(path.join(
        pocketbaseInstallPath,
        getExecutable()), ['serve']);
    await sleep(1000);
    const Pocketbase = (await import('pocketbase')).default;
    let pb = new Pocketbase('http://127.0.0.1:8090');
    pb.autoCancellation(false);

    // delete all published recipes and replace
    let oldrecords = await pb.collection(MONO_COLLECTION_ID).getFullList(
        {filter:`omni_id~"wf" && blob.owner="-----public-----"`}
    );
    let deleteCmd = new Array();
    for(let i=0; i<oldrecords.length; ++i) {
        deleteCmd.push(pb.collection(MONO_COLLECTION_ID).delete(oldrecords[i].id));
    }
    await Promise.all(
        deleteCmd
    );
    console.log(`Deleted ${oldrecords.length} demo recipes.`);
    let createCmd = new Array();
    publishedRecipes.forEach(element => {
        // If the recipe does NOT have a "system" tag, generate a new ID.
        if (!element.meta.tags.includes("system")) {
            element.id = v4();
            element._id = `wf:${element.id}`;
        }
        let omni_id = element._id;
        createCmd.push(pb.collection(MONO_COLLECTION_ID).create(
            {omni_id: omni_id, blob: element}
        ));
    });                
    await Promise.all(
        createCmd
    );
    console.info(`Updated ${createCmd.length} demo recipes.`);
    dbprocess.kill();
}

const extensionHooks = {
    'registry.package_installed': async function(ctx, omniPackage, installationId, orgId, customBaseUrl, duration) {
      console.log('Extension installed:', omniPackage);
      console.log('Reconciling published recipes...')
      await run();  // Trigger the script to run when a package is installed
    }
  };

export default {hooks: extensionHooks}
