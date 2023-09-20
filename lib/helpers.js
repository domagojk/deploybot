
function checkboxOption(option, value) {
  return {
    text: {
      type: "plain_text",
      text: option,
    },
    value: value || option,
  };
}

function textSection(text) {
  return {
    type: "section",
    text: {
      type: "mrkdwn",
      text,
    },
  };
}

module.exports = {
  checkboxOption,
  textSection,
};
