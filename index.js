const { WebSocketProvider } = require('ethers');
const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));

const TOKEN_ADDRESS = '0x81aB049482ae02213d374A33E7F8200d93eE8BcA';
const APE_EXPRESS_ADDRESS = '0xc80f1228E38fd8da9D37B0c197319598a4F843B3';
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`;
const provider = new WebSocketProvider(process.env.ALCHEMY_WS);
const TRANSFER_TOPIC = '0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef';

// Escape for MarkdownV2
const escapeMarkdown = (text) =>
  text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, '\\$1');

// Format + send alert message
async function sendCryBuyAlert(toAddress, amountCry) {
  let spentAPE = '??';
  let marketcap = '??';
  let liquidity = '??';

  try {
    const tokenRes = await fetch('https://ape.express/api/tokens/0x81ab049482ae02213d374a33e7f8200d93ee8bca');
    const tokenData = await tokenRes.json();
    console.log('🔍 Token Data:', tokenData.bondingCurve?.realAPEReserve);

    const price = parseFloat(tokenData?.price ?? '0');
const totalSupplyRaw = tokenData?.totalSupply ?? '0';
const reserveRaw = tokenData?.bondingCurve?.realAPEReserve ?? '0';

const supply = Number(BigInt(totalSupplyRaw) / 10n ** 18n);
const reserve = Number(BigInt(reserveRaw) / 10n ** 18n);

spentAPE = (amountCry * price).toFixed(3) + ' APE';

liquidity = reserve ? reserve.toFixed(2) + ' $APE' : '??';
marketcap = (supply * price).toLocaleString(undefined, { maximumFractionDigits: 0 }) + ' $APE';
} catch (err) {
    console.error('❌ Failed to fetch CRY stats:', err);
  }

  const roundedCry = Math.floor(amountCry); // whole number
  const escapedAmount = escapeMarkdown(`${roundedCry} $CRY`);
  const escapedLiq = escapeMarkdown(liquidity);

  const escapedTo = escapeMarkdown(toAddress);
  const escapedSpent = escapeMarkdown(spentAPE);
  const escapedCap = escapeMarkdown(marketcap);
  const escapedChart = escapeMarkdown(`https://ape.express/explore/${TOKEN_ADDRESS}`);
  const escapedTG = escapeMarkdown(`https://t.me/+1DtUpAKJVIEzMjIx`);
  const escapedX = escapeMarkdown(`https://x.com/cryonape`);
  const escapedWeb = escapeMarkdown(`https://cryonape.com`);

  const centeredTitle = `${'\u00A0'.repeat(0)}🚨 *NEW BUY* 🚨`;
  const centeredPair = `${'\u00A0'.repeat(0)}🦍\\(WAPE\\/CRY\\)🦍`;
  const centeredCrying = `${'\u00A0'.repeat(0)}🥲🥲 *I'M CRYING* 🥲🥲`;
  const centeredEmojis = `${'\u00A0'.repeat(0)}\😭😭😭😭😭😭😭😭😭`;
  const msg = `${centeredTitle}  
${centeredPair}

${centeredCrying}
${centeredEmojis}

🦍 *SPENT:* ${escapedSpent}  
🥲 *GOT:* ${escapedAmount}  
💳 *BUYER:* \`${escapedTo}\`  
💧 *LIQUIDITY:* ${escapedLiq}
📊 *MARKETCAP:* ${escapedCap}  

[CHART](${escapedChart}) \\| [TG](${escapedTG}) \\| [X](${escapedX}) \\| [WEBSITE](${escapedWeb})`;

  try {
    const response = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: process.env.CHAT_ID,
          photo: 'https://admin.demwitches.xyz/chart.jpg', // your custom image
          caption: msg,
          parse_mode: 'MarkdownV2',
          disable_web_page_preview: true // ⛔ prevents auto-embed from chart link
        }),
      });    
    const res = await response.json();
    if (!res.ok) {
      console.error('❌ Telegram API Error:', res);
    } else {
      console.log('✅ Alert sent!');
    }
  } catch (err) {
    console.error('🚨 Failed to send Telegram message:', err);
  }
}

// 🎯 Real buy detection
provider.on(
  {
    address: TOKEN_ADDRESS,
    topics: [
      TRANSFER_TOPIC,
      null,
      `0x000000000000000000000000${APE_EXPRESS_ADDRESS.slice(2).toLowerCase()}`
    ]
  },
  async (log) => {
    const from = '0x' + log.topics[1].slice(26);
    const to = '0x' + log.topics[2].slice(26);
    const value = BigInt(log.data);
    const formatted = Number(value) / 1e18;

    console.log(`🔔 Detected buy to ApeExpress: ${formatted} $CRY from ${from}`);
    await sendCryBuyAlert(from, formatted);
  }
);
