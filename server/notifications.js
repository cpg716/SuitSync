const axios=require('axios');
const sgMail=require('@sendgrid/mail');
const PODIUM_API_KEY=process.env.PODIUM_API_KEY;
sgMail.setApiKey(process.env.SENDGRID_API_KEY);
const podiumClient=axios.create({baseURL:'https://api.podium.com/v4',headers:{Authorization:`Bearer ${PODIUM_API_KEY}`,'Content-Type':'application/json'}});
async function sendSMS(conversationId,body){return podiumClient.post(`/conversations/${conversationId}/messages`,{content:body,outboundMessage:true});}
async function sendEmail(to,subject,html){return sgMail.send({to,from:process.env.SENDGRID_FROM,subject,html});}
module.exports={sendSMS,sendEmail};