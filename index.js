// Install dependencies: npm install express puppeteer axios dotenv

const express = require('express');
const puppeteer = require('puppeteer');
const axios = require('axios');
require('dotenv').config();

const app = express();
const PORT = 3000;

app.get('/scrape', async (req, res) => {
    const searchQuery = req.query.q || 'nike';
    const url = `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}&_pgn=1`;
    
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    
    let results = [];
    let pageNum = 1;

    try {
        while (true) {
            console.log(`Scraping page ${pageNum}...`);
            await page.goto(url.replace('_pgn=1', `_pgn=${pageNum}`), { waitUntil: 'load', timeout: 0 });
            
            const products = await page.evaluate(() => {
                return Array.from(document.querySelectorAll('.s-item')).map(item => {
                    return {
                        name: item.querySelector('.s-item__title')?.innerText || '-',
                        price: item.querySelector('.s-item__price')?.innerText || '-',
                        link: item.querySelector('.s-item__link')?.href || '-'
                    };
                });
            });

            if (products.length === 0) break;
            
            for (let product of products) {
                if (product.link !== '-') {
                    const productPage = await browser.newPage();
                    await productPage.goto(product.link, { waitUntil: 'load', timeout: 0 });
                    
                    const description = await productPage.evaluate(() => {
                        return document.querySelector('#viTabs_0_is')?.innerText || '-';
                    });
                    
                    product.description = description;
                    await productPage.close();
                } else {
                    product.description = '-';
                }
            }

            results.push(...products);
            pageNum++;
        }
    } catch (error) {
        console.error('Error scraping:', error);
    } finally {
        await browser.close();
    }
    
    res.json(results);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
