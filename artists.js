const axios = require('axios')
const cheerio = require('cheerio');
const fs = require('fs')
const nodemailer = require("nodemailer");
require("dotenv").config();

const credentials = JSON.parse(fs.readFileSync("credentials.json", "utf8")); // Parse my credentials.json file
// Mr. Irani will create one
  
axios.get('https://www.popvortex.com/music/charts/top-rap-songs.php')
    .then((response) => {
            // Load HTML data into cheerio
            const $ = cheerio.load(response.data);
            const input = process.argv.slice(2);

        // Select artist element through tag and class
        if (input.length === 0) {
            console.log("Please input at least one artist.");
            process.exit(1);
        }
        

        const generalInputs = input.map(input => input.toLowerCase());
        const matches = []
        
        $('p.title-artist').each(function (i, element) { // For each specified element in the DOM
            const title = $(this).find('cite.title').text()
            const artist = $(this).find('em.artist').text()

            // Split the artist name into parts (handle features like "feat." or "&")
            const artistParts = artist.split(/&/).map(part => part.trim().toLowerCase());
            const featuredArtists = title.match(/(?:feat\.|,)\s*([^,]+)/gi)
            ?.map(f => f.replace(/(?:feat\.|,)\s*/i, "").trim().toLowerCase()) || []
            
            // Check if the input exactly matches the artist or title (with feature handling)
            generalInputs.forEach(generalInput => {
                if(i < 25 && artistParts.includes(generalInput) || featuredArtists.includes(generalInput)) {
                matches.push({title, artist}) // If the index is less than 25 and all cases pass, 
                // push the artist name to the list.
                }
             });
        });

        if (matches.length === 0) { 
            console.log("Enter a valid rapper name.");
            process.exit(1) // Exit the program and dont send an email
        } else {
            matches.forEach(({ title, artist }) => {
                console.log(` RECEIVED - Title: ${title}, Artist(s): ${artist}`); // All the logs going into our email.
         });
        }

        const transporter = nodemailer.createTransport({
            host: "smtp.gmail.com",
            port: 587,
            secure: false, // true for port 465, false for other ports
            auth: {
              user: credentials.user,
              pass: credentials.password,
            },
          });
          
          // Prepare email content
        const emailBody = matches.map(match => `**${match.artist}**: *${match.title}*`).join("\n");
        const emailBodyHTML = matches.map(match => `<b>${match.artist}</b>: <i>${match.title}</i>`).join("<br>"); // 
        const emailSubject = `Your artists are: ${input.join(", ")}`; // title of our email

          // Send the email
        const mailOptions = {
            from: `"${credentials.from}" <${credentials.user}>`,
            to: credentials.to,
            subject: emailSubject,
            text: emailBody, // Plain text version
            html: emailBodyHTML // HTML version
        };

        transporter.sendMail(mailOptions, (error, info) => {
            if(error) {
                console.error("Error sending the email" , error)
            } else {
                console.log("Email has been sent" , info.response)
            }
        });
  
    }) // This as a whole will be O(n * m) of something with O(n + n) memory but not 
    // too big of a deal at this scale, realized a list structure (matches) would be better for the nodemailer portion
    .catch((error) => {
        console.log('Error fetching data:', error.message);
    });