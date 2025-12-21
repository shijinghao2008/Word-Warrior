
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY; // Use service role key for bypassing RLS if needed, or ANON if policy allows

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Key in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importListeningData() {
    const csvPath = path.resolve(__dirname, '../listening_transcripts_template_format.csv');
    console.log(`Reading CSV from: ${csvPath}`);

    try {
        const fileContent = fs.readFileSync(csvPath, 'utf-8');
        const records = parse(fileContent, {
            columns: false, // Access by index since header might be missing or specific
            skip_empty_lines: true,
            relax_quotes: true, // Handle quotes leniently
        });

        console.log(`Found ${records.length} records. Processing...`);

        let successCount = 0;
        let errorCount = 0;

        for (const record of records) {
            // Based on CSV structure: Title, Content, Level (maybe?), JSON Questions
            // Record[0]: Title
            // Record[1]: Content (Transcript)
            // Record[2]: Level/Category (e.g., "Cѧ") - seems to be garbage or specific code, we can likely ignore or use as level
            // Record[3]: JSON Questions string

            const title = record[0];
            const content = record[1];
            const levelCode = record[2]; // Optional usage
            const questionsJsonString = record[3];

            if (!title || !content || !questionsJsonString) {
                console.warn(`Skipping incomplete record: ${title}`);
                continue;
            }

            let questions;
            try {
                // The JSON in CSV might have extra quotes or be malformed, basic cleanup might be needed
                // But usually csv-parse handles CSV escaping. 
                // The constraint is that the internal JSON use double quotes which are escaped in CSV.
                questions = JSON.parse(questionsJsonString);
            } catch (e) {
                console.error(`Failed to parse JSON for "${title}":`, e);
                errorCount++;
                continue;
            }

            const { error } = await supabase
                .from('listening_materials')
                .insert({
                    title: title.trim(),
                    content: content.trim(),
                    questions: questions,
                    level: 'Primary', // Defaulting to Primary as per filename hint "Listening Primary School"
                    audio_url: null // Explicitly null as requested
                });

            if (error) {
                console.error(`Error inserting "${title}":`, error.message);
                errorCount++;
            } else {
                successCount++;
            }
        }

        console.log(`Import completed.`);
        console.log(`Success: ${successCount}`);
        console.log(`Errors: ${errorCount}`);

    } catch (err) {
        console.error('Failed to read or parse CSV:', err);
    }
}

importListeningData();
