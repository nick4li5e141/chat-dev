import express from 'express';
import fetch from 'node-fetch';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();
const app = express();
app.use(cors());
app.use(express.static('public'));

const PORT = process.env.PORT;
const API_KEY = process.env.API_KEY;
const API_URL = process.env.API_URL;
const systemPrompt = process.env.SYSTEM_PROMPT;

app.get('/generate-text', async (req, res) => {
    const userPrompt = req.query.prompt;
    if (!userPrompt) {
        res.status(400).send("No prompt provided");
        return;
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const intervalId = setInterval(() => {
        res.write(`data: ${new Date().toISOString()}\n\n`);
    }, 1000);

    req.on('close', () => {
        clearInterval(intervalId);
        res.end();
    });

    try {
        const apiResponse = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "dolphin-2_6-phi-2.Q3_K_S",
                messages: [
                    { "role": "system", "content": systemPrompt },
                    { "role": "user", "content": userPrompt }
                ],
                temperature: 0.7,
                stream: true
            })
        });

        apiResponse.body.on('data', (chunk) => {
            res.write(`data: ${chunk}\n\n`);
        });

        apiResponse.body.on('end', () => {
            res.write('event: end\ndata:\n\n');
            res.end();
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).send('Error processing request');
    }
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
