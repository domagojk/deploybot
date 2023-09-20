const { App, LogLevel } = require("@slack/bolt");
const { config } = require("dotenv");
const {
  startDeploy,
  cancelDeploy,
  goToStaging,
  inStaging,
} = require("./lib/buttons");
const { checkboxOption, textSection } = require("./lib/helpers");

config();

/** Initialization */
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
  logLevel: LogLevel.DEBUG,
});

let allServices = {
  clsi: {
    status: null, // null, pending, inprogess-staging, staging, inprogess-production, production
  },
  history: {
    status: null, // null, pending, inprogess-staging, staging, inprogess-production, production
  },
  web: {
    status: null, // null, pending, inprogess-staging, staging, inprogess-production, production
  },
};

let deploys = {
  deploy_123: {
    channelId: "",
    actionMessageId: "",
    progressMessageId: "",
    services: ["clsi", "history", "web"],
  },
};

app.message(
  /^(!deploy|going to deploy).*/,
  async ({ message, event, context }) => {
    const deployId = "deploy_" + Math.random().toString(36).substring(7);

    const actionMessage = await app.client.chat.postMessage({
      thread_ts: message.ts,
      channel: event.channel,
      blocks: [
        {
          block_id: "deploy_form",
          type: "section",
          text: {
            type: "mrkdwn",
            text: "Time for a deploy :rocket: \n What service(s) are you deploying?",
          },
          accessory: {
            action_id: "service_selection",
            type: "checkboxes",
            // initial_options: [],
            options: [
              checkboxOption("clsi"),
              checkboxOption("history"),
              checkboxOption("web"),
            ],
          },
        },
        {
          type: "actions",
          elements: [
            {
              ...startDeploy,
              value: deployId,
            },
            {
              ...cancelDeploy,
              value: deployId,
            },
          ],
        },
      ],
    });

    deploys[deployId] = {
      actionMessageId: actionMessage.ts,
      channelId: event.channel,
    };
  }
);

async function updateDeployStatus({ deployId, status, text }) {
  const deploy = deploys[deployId];

  if (deploy.progressMessageId) {
    await app.client.chat.update({
      ts: deploy.progressMessageId,
      channel: deploy.channelId,
      text,
    });
  } else {
    const deployMessage = await app.client.chat.postMessage({
      channel: deploy.channelId,
      text,
    });

    deploy.progressMessageId = deployMessage.ts;
  }

  for (const service of deploy.services) {
    allServices[service].status = status;
  }
}

app.action(startDeploy.action_id, async ({ body, ack }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === startDeploy.action_id
  ).value;

  const selectedServices =
    body.state.values.deploy_form.service_selection.selected_options.map(
      (o) => o.value
    );

  deploys[deployId].services = selectedServices;

  for (const service of selectedServices) {
    if (allServices[service].status !== null) {
      await app.client.chat.postMessage({
        thread_ts: body.message.ts,
        user: body.user,
        channel: body.channel.id,
        text: `There is already a deploy in progress. Current status: *${allServices[service].status}*`,
      });
      await ack();
      return;
    }
  }

  try {
    await updateDeployStatus({
      status: startDeploy.action_id,
      text: `:overleaf-duck-party: Deploy of ${selectedServices.join(
        ", "
      )} started :rocket:`,
      deployId,
    });

    await app.client.chat.update({
      channel: body.channel.id,
      ts: body.message.ts,
      blocks: [
        textSection(
          "Current deploy status: :rocket: *pending* (accepting additional PRs) :rocket: \nUse the buttons below to update the status."
        ),
        {
          type: "actions",
          elements: [
            { ...goToStaging, value: deployId },
            { ...inStaging, value: deployId },
            { ...cancelDeploy, value: deployId },
          ],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }

  await ack();
});

app.action(goToStaging.action_id, async ({ body, ack, action }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === goToStaging.action_id
  ).value;

  const deploy = deploys[deployId];

  try {
    await updateDeployStatus({
      channel: body.channel.id,
      status: goToStaging.action_id,
      text: ":overleaf-duck-party: Deploy of service(s), going to staging :rocket:",
      deployId,
    });

    await app.client.chat.update({
      channel: body.channel.id,
      ts: deploy.actionMessageId,
      blocks: [
        textSection(
          "Current deploy status: :rocket: *going to staging* :rocket:\nUse the buttons below to update the status."
        ),
        {
          type: "actions",
          elements: [inStaging, cancelDeploy],
        },
      ],
    });
  } catch (error) {
    console.error(error);
  }

  await ack();
});

(async () => {
  try {
    await app.start(process.env.PORT || 3000);
    console.log("⚡️ Bolt app is running! ⚡️");
  } catch (error) {
    console.error("Unable to start App", error);
  }
})();
