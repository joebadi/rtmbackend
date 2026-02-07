
import jwt from 'jsonwebtoken';
import axios from 'axios';

const JWT_SECRET = "rtm-jwt-secret-change-in-production-2026";
const API_URL = "http://localhost:4001/api/matches/nearby";

// Joe's User ID
const userId = "985b5854-c5fe-43d1-ac07-046174971d6f";

async function main() {
    console.log('--- Testing Explore API ---');

    // Generate Token
    const token = jwt.sign({ userId }, JWT_SECRET, { expiresIn: '1d' });
    console.log('Generated Token for Joe.');

    try {
        const response = await axios.post(
            API_URL,
            {
                latitude: 5.5035254,
                longitude: 5.7974107,
                radius: 50,
                limit: 20
            },
            {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(response.data, null, 2));
    } catch (error: any) {
        if (error.response) {
            console.error('Error Status:', error.response.status);
            console.error('Error Data:', error.response.data);
        } else {
            console.error('Error:', error.message);
        }
    }
}

main();
