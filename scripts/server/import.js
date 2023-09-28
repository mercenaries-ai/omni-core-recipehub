/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

import fs from 'node:fs';
import path from 'node:path';
import { v4 } from 'uuid';
import { fileURLToPath } from 'url';

const MONO_COLLECTION_ID = "legacyMonoCollection";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    return;
    const templateDir = path.join(__dirname, '../../templates');
    const files = fs.readdirSync(templateDir);  

    const jsonFiles = files.filter(file => 
        path.extname(file).toLowerCase() === '.json'
    );    

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

async function reconcilePublishedRecipes(publishedRecipes) {
    const Pocketbase = (await import('pocketbase')).default;
    let pb = new Pocketbase('http://127.0.0.1:8090');
    pb.autoCancellation(false);

    let oldrecords = await pb.collection(MONO_COLLECTION_ID).getFullList(
        {filter:`omni_id~"wf" && blob.owner="-----public-----"`}
    );
    let deleteCmd = [];
    for(let i=0; i<oldrecords.length; ++i) {
        deleteCmd.push(pb.collection(MONO_COLLECTION_ID).delete(oldrecords[i].id));
    }
    await Promise.all(deleteCmd);
    console.log(`Deleted ${oldrecords.length} demo recipes.`);
    let createCmd = [];
    publishedRecipes.forEach(element => {
        if (!element.meta.tags.includes("system")) {
            element.id = v4();
            element._id = `wf:${element.id}`;
        }
        let omni_id = element._id;
        createCmd.push(pb.collection(MONO_COLLECTION_ID).create(
            {omni_id: omni_id, blob: element}
        ));
    });                
    await Promise.all(createCmd);
    console.info(`Updated ${createCmd.length} demo recipes.`);
}

const script = {
    name: 'import',
    exec: async function (ctx, payload) {
        console.log('Starting recipe import...');
        await run();
        console.log('Recipe import completed.');
        return { status: 'success', message: 'Recipe import completed.' };
    }
};
export { run, script };
