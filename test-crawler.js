const axios = require('axios');
async function run() {
  const q = '"Seniorenzentrum Metropol" Lippstadt Pflegeheim Fax Email';
  try {
    const response = await axios.post('https://google.serper.dev/search', {
        q, gl: 'de', hl: 'de', num: 5
    }, {
        headers: {
            'X-API-KEY': process.env.SERPER_API_KEY,
            'Content-Type': 'application/json'
        }
    });
    console.log(JSON.stringify(response.data.organic, null, 2));
  } catch (err) {
      console.log("Error:", err.message);
  }
}
run();
