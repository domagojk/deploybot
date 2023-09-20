module.exports = {
  startDeploy: {
    type: "button",
    text: {
      type: "plain_text",
      text: "Start deploy :rocket: (pending)",
      emoji: true,
    },
    action_id: "start_deploy",
  },
  cancelDeploy: {
    type: "button",
    text: {
      type: "plain_text",
      text: "Cancel :x:",
      emoji: true,
    },
    action_id: "cancel_deploy",
  },
  goToStaging: {
    type: "button",
    text: {
      type: "plain_text",
      text: "Going to staging :rocket:",
      emoji: true,
    },
    action_id: "going_to_staging",
  },
  inStaging: {
    type: "button",
    text: {
      type: "plain_text",
      text: "In staging :white_check_mark:",
      emoji: true,
    },
    action_id: "in_staging",
  },
};
