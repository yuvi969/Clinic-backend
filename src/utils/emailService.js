const { Resend } = require("resend");

const resend = new Resend(
  process.env.RESEND_API_KEY
);

const sendEmail = async ({
  to,
  subject,
  text,
}) => {

  const response =
    await resend.emails.send({
      from:
        "onboarding@resend.dev",

      to,

      subject,

      text,
    });

  console.log(response);

};

module.exports = {
  sendEmail,
};