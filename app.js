const { App, LogLevel } = require("@slack/bolt");
const { config } = require("dotenv");
const {
  startDeploy,
  cancelDeploy,
  goingToStaging,
  inStaging,
  goingToProduction,
  inProduction,
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

let deploys = {
  deploy_123: {
    channelId: "",
    actionMessageId: "",
    progressMessageId: "",
    services: [],
  },
};

app.message(/(!deploy).*/, async ({ message, event, context }) => {
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
});

app.action(startDeploy.action_id, async ({ body, ack }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === startDeploy.action_id
  ).value;

  const selectedServices =
    body.state.values.deploy_form.service_selection.selected_options.map(
      (o) => o.value
    );

  deploys[deployId].services = selectedServices;

  for (const deploy of Object.values(deploys)) {
    if (deploy === deploys[deployId]) {
      continue;
    }

    for (const service of selectedServices) {
      if (deploy.services.includes(service)) {
        await app.client.chat.update({
          channel: body.channel.id,
          ts: body.message.ts,
          blocks: [
            textSection(
              `${service} is already being deployed! Please wait until it's done. \nUse the buttons below to update the status.`
            ),
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
                { ...startDeploy, value: deployId },
                { ...cancelDeploy, value: deployId },
              ],
            },
          ],
        });

        await ack();
        return;
      }
    }
  }

  try {
    await updateDeployStatus({
      text: `:overleaf-duck-party: deploying _services_... status: *pending* :rocket:`,
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
            { ...goingToStaging, value: deployId },
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

app.action(goingToStaging.action_id, async ({ body, ack }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === goingToStaging.action_id
  ).value;
  const deploy = deploys[deployId];

  try {
    await updateDeployStatus({
      channel: body.channel.id,
      text: `:overleaf-duck-party: deploying _services_... status: *going to staging* :rocket:`,
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
          elements: [
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

app.action(inStaging.action_id, async ({ body, ack }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === inStaging.action_id
  ).value;
  const deploy = deploys[deployId];

  try {
    await updateDeployStatus({
      channel: body.channel.id,
      text: `:overleaf-duck-party: deploying _services_... status: *in staging!* :rocket:`,
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
          elements: [
            { ...goingToProduction, value: deployId },
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

app.action(goingToProduction.action_id, async ({ body, ack }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === goingToProduction.action_id
  ).value;
  const deploy = deploys[deployId];

  try {
    await updateDeployStatus({
      channel: body.channel.id,
      text: `:overleaf-duck-party: Deploying _services_... status: *going to production!* :rocket:`,
      deployId,
    });

    await app.client.chat.update({
      channel: body.channel.id,
      ts: deploy.actionMessageId,
      blocks: [
        textSection(
          "Current deploy status: :rocket: *going to production* :rocket:\nUse the buttons below to update the status."
        ),
        {
          type: "actions",
          elements: [
            { ...inProduction, value: deployId },
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

app.action(inProduction.action_id, async ({ body, ack }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === inProduction.action_id
  ).value;
  const deploy = deploys[deployId];

  try {
    await updateDeployStatus({
      channel: body.channel.id,
      text: `:white_check_mark: deploy finished! _services_ deployed :rocket:`,
      deployId,
    });

    await app.client.chat.update({
      channel: body.channel.id,
      ts: deploy.actionMessageId,
      blocks: [
        textSection(
          "Current deploy status: :rocket: *in production* :rocket:\nAll done!"
        ),
      ],
    });

    delete deploys[deployId];
  } catch (error) {
    console.error(error);
  }

  await ack();
});

app.action(cancelDeploy.action_id, async ({ body, ack }) => {
  const deployId = body.actions.find(
    (a) => a.action_id === cancelDeploy.action_id
  ).value;
  const deploy = deploys[deployId];

  try {
    await updateDeployStatus({
      channel: body.channel.id,
      text: `deploy of _services_ *canceled*!`,
      deployId,
    });

    await app.client.chat.update({
      channel: body.channel.id,
      ts: deploy.actionMessageId,
      blocks: [textSection("Current deploy status: *cancelled*")],
    });

    delete deploys[deployId];
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

async function updateDeployStatus({ deployId, text }) {
  const deploy = deploys[deployId];

  const content = text.replace(
    "_services_",
    deploy.services.map((s) => `\`${s}\``).join(" ")
  )

  if (deploy.progressMessageId) {
    await app.client.chat.update({
      ts: deploy.progressMessageId,
      channel: deploy.channelId,
      text: content,
    });
  } else {
    const deployMessage = await app.client.chat.postMessage({
      channel: deploy.channelId,
      text: content,
    });

    deploy.progressMessageId = deployMessage.ts;
  }
}
