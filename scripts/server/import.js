/**
 * Copyright (c) 2023 MERCENARIES.AI PTE. LTD.
 * All rights reserved.
 */

import fs from 'node:fs/promises';  // Importing the promises API
import path from 'node:path';
import { v4 } from 'uuid';
import { fileURLToPath } from 'url';

const MONO_COLLECTION_ID = "legacyMonoCollection";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addMetaTag(doc, tag) {
    if (!doc.meta.tags.includes(tag)) {  // Simplified using includes
        doc.meta.tags.push(tag);
    }
}

async function run() {
    try {
        const templateDir = path.join(__dirname, '../../templates');
        if (!(await fs.stat(templateDir)).isDirectory()) {  // Check if directory exists
            console.error('Directory does not exist:', templateDir);
            return;
        }

        const files = await fs.readdir(templateDir);
        const jsonFiles = files.filter(file => path.extname(file).toLowerCase() === '.json');
        const demoRecipes = [
            ['Bugbear', 'c0deba5e-417d-49df-96d3-8aeb8fc15402'],
            ['Celestia', 'c0deba5e-786a-4d4b-88d9-1694ebc85527'],
            ['Chef', 'c0deba5e-7634-49ac-a2b7-878f8476057b'],
        ];

        let jsonArray = [];
        for (let file of jsonFiles) {
            console.log('Processing recipe json:', file);
            let content = await fs.readFile(path.join(templateDir, file));
            let doc = JSON.parse(content);
            doc.owner = '-----public-----';

            for (let [fileNamePrefix, overrideId] of demoRecipes) {
                if (file.startsWith(fileNamePrefix)) {
                    doc.id = overrideId;
                    addMetaTag(doc, 'system');
                }
            }

            addMetaTag(doc, 'template');
            doc.meta.org = 'omnitool_core_recipes';
            doc['publishedTo'] = [];
            doc['_id'] = `wf:${doc.id}`;
            jsonArray.push(doc);
        }

        await reconcilePublishedRecipes(jsonArray);
    } catch (error) {
        console.error(error);
    }
}

async function reconcilePublishedRecipes(publishedRecipes) {
    try {
        const Pocketbase = (await import('pocketbase')).default;
        let pb = new Pocketbase(process.env.DATABASE_URL || 'http://127.0.0.1:8090');
        pb.autoCancellation(false);

        let oldrecords = await pb.collection(MONO_COLLECTION_ID).getFullList(
            { filter: `omni_id~"wf" && blob.owner="-----public-----"` }
        );
        let deleteCmd = oldrecords.map(record => pb.collection(MONO_COLLECTION_ID).delete(record.id));
        await Promise.all(deleteCmd);
        console.log(`Deleted ${oldrecords.length} demo recipes.`);

        let createCmd = publishedRecipes.map(element => {
            if (!element.meta.tags.includes("system")) {
                element.id = v4();
                element._id = `wf:${element.id}`;
            }
            let omni_id = element._id;
            return pb.collection(MONO_COLLECTION_ID).create({ omni_id: omni_id, blob: element });
        });

        await Promise.all(createCmd);
        console.info(`Updated ${createCmd.length} demo recipes.`);
    } catch (error) {
        console.error(error);
    }
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
