var nodemailer= require('nodemailer');
async function varify(to_email){
let transporter = nodemailer.createTransport({
    service:"gmail",
    host:"smtp.gmail.com",
    port:465,
    secure:false,
    auth: {
        user:"dsalgotra2021@gmail.com",
        pass:"jmjzhivngrevgenl"
    }
});

    let info = await transporter.sendMail({
        to:to_email,
        from:"dsalgotra2021@gmail.com",
        subject:"Varify Email",
        html:"<h2> Please Click On Link to Varify EMail ID </h2> <a href=\"http://localhost:8080/varify?email="+to_email+"\"> Click To Varify</a>"
    })
    // console.log(info);
    if(info.messageId)
    return true;  
else
return false;
}
module.exports=varify;


