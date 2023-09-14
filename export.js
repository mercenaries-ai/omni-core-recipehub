const fs = require('node:fs');
const path = require('node:path');

async function run() {
    const files = fs.readdirSync(process.cwd());
    const outFile = 'published_recipes.json';
    const outputDirectory = path.join(process.cwd(), '../mercs/setup/');
    const outputPath = path.join(outputDirectory, outFile);

    // Ensure the directory exists
    // if (!fs.existsSync(outputDirectory)) {
    //     fs.mkdirSync(outputDirectory, { recursive: true });
    // }

    // Excludes output
    const jsonFiles = files.filter(file => 
        path.extname(file).toLowerCase() === '.json' &&
        file !== outFile
    );    

    // Convert to wf format    
    let jsonArray = [];
    for(let file of jsonFiles) {
        let content = fs.readFileSync(path.join(process.cwd(), file));
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
    
    fs.writeFileSync(outputPath, JSON.stringify(jsonArray, null, 2));
    
    // Validate the JSON file
    try {
        JSON.parse(fs.readFileSync(outputPath)); 
        console.log(`JSON file is exported into ${outputPath}`);
        console.log(`Copy it to the main project mercs/server/${outFile} then submit!`);
    } catch (error) {
        console.error('Invalid JSON file:', error);
    }
}

run();
