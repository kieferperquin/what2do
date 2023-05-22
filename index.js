require('dotenv').config();

const { Client, GatewayIntentBits } = require('discord.js');
const sqlite3 = require('sqlite3').verbose();
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] });

const prefix = '!';

const activities_list = [
  { message: `Do you know what to do?` },
  { message: `Need help?` },
  { message: `You good?` }
];

let db;

let lists = {}; // Define the lists object

client.once('ready', async () => {
  console.log('Bot is ready.');

  try {
    const commands = [
      {
        name: 'help',
        description: 'Display the list of available commands.',
      },
      {
        name: 'newlist',
        description: 'Create a new list with the specified name.',
        options: [
          {
            name: 'name',
            description: 'The name of the new list.',
            type: 'STRING',
            required: true,
          },
        ],
      },
      {
        name: 'add',
        description: 'Add an item to an existing list.',
        options: [
          {
            name: 'list',
            description: 'The name of the list.',
            type: 'STRING',
            required: true,
          },
          {
            name: 'item',
            description: 'The item to add.',
            type: 'STRING',
            required: true,
          },
        ],
      },
      {
        name: 'remove',
        description: 'Remove an item from an existing list.',
        options: [
          {
            name: 'list',
            description: 'The name of the list.',
            type: 'STRING',
            required: true,
          },
          {
            name: 'item',
            description: 'The item to remove.',
            type: 'STRING',
            required: true,
          },
        ],
      },
      {
        name: 'lists',
        description: 'Display the names of all existing lists.',
      },
      {
        name: 'random',
        description: 'Get a random item from the specified list.',
        options: [
          {
            name: 'list',
            description: 'The name of the list.',
            type: 'STRING',
            required: true,
          },
          {
            name: 'excludedItems',
            description: 'Items to exclude from random selection.',
            type: 'STRING',
            required: false,
          },
        ],
      },
      {
        name: 'inlist',
        description: 'Display the items in the specified list.',
        options: [
          {
            name: 'list',
            description: 'The name of the list.',
            type: 'STRING',
            required: true,
          },
        ],
      },
    ];

    // Register the commands globally
    await client.application.commands.set(commands);
    console.log('Commands registered successfully.');
  } catch (error) {
    console.error('Failed to register commands:', error);
  }
});

client.on('ready', () => {
  connectDatabase();
  loadLists();

  setInterval(() => {
    const index = Math.floor(Math.random() * (activities_list.length - 1) + 1);
    client.user.setActivity(activities_list[index].message);
  }, 100000);
});

// prefix commands
client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const userId = message.author.id; // Get the user ID

  switch (command) {
    case 'help':
      PrefixHelp();
      break;

    case 'newlist':
      PrefixNewList();
      break;

    case 'add':
      PrefixAdd();
      break;

    case 'remove':
      PrefixRemove();
      break;

    case 'lists':
      PrefixLists();
      break;

    case 'random':
      PrefixRandom();
      break;

    case 'inlist':
      PrefixInList
      break;
  }
});

// discord commands
client.on('interactionCreate', async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'help') {
    InteractionHelp();
  } 
  else if (commandName === 'newlist') {
    InteractionNewList();
  } 
  else if (commandName === 'add') {
    InteractionAdd();
  } 
  else if (commandName === 'remove') {
    InteractionRemove();
  } 
  else if (commandName === 'lists') {
    InteractionLists();
  } 
  else if (commandName === 'random') {
    InteractionRandom();
  } 
  else if (commandName === 'inlist') {
    InteractionInLists();
  }
});

//#region prefix
function PrefixHelp() {
  message.reply(`The commands are:
    • \`${prefix}help\`: prints this list
    • \`${prefix}newlist <name>\`: Create a new list with the specified name.
    • \`${prefix}add <list name> <item>\`: Add an item to an existing list.
    • \`${prefix}remove <list name> <item>\`: Remove an item from an existing list.
    • \`${prefix}lists\`: Display the names of all existing lists.
    • \`${prefix}random <list name> [item, item, ...]\`: Get a random item from the specified list, excluding any items specified in the message.
    • \`${prefix}inlist <list name>\`: Display the items in the list specified in the message`);
}

function PrefixNewList() {
  const listName = args[0];
  if (listName) {
    if (!lists[userId][listName]) {
      lists[userId][listName] = [];
      saveList(userId, listName, ''); // Save an empty item to the database
      message.reply(`List '${listName}' created.`);
    } 
    else {
      message.reply(`List '${listName}' already exists.`);
    }
  } 
  else {
    message.reply('You need to provide a name for the new list.');
  }
}

function PrefixAdd() {
  const listToAdd = args[0];
  const itemToAdd = args.slice(1).join(' ');
  if (listToAdd && itemToAdd) {
    if (lists[userId][listToAdd]) {
      lists[userId][listToAdd].push(itemToAdd);
      saveList(userId, listToAdd, itemToAdd); // Save the item to the database
      message.reply(`Item '${itemToAdd}' added to list '${listToAdd}'.`);
    } 
    else {
      message.reply(`List '${listToAdd}' does not exist.`);
    }
  } 
  else {
    message.reply('You need to provide the name of the list and the item to add.');
  }
}

function PrefixRemove() {
  const listToRemove = args[0];
  const itemToRemove = args.slice(1).join(' ');
  if (listToRemove && itemToRemove) {
    if (lists[userId][listToRemove]) {
      const index = lists[userId][listToRemove].indexOf(itemToRemove);
      if (index !== -1) {
        lists[userId][listToRemove].splice(index, 1);
        message.reply(`Item '${itemToRemove}' removed from list '${listToRemove}'.`);
      } 
      else {
        message.reply(`Item '${itemToRemove}' not found in list '${listToRemove}'.`);
      }
    } 
    else {
      message.reply(`List '${listToRemove}' does not exist.`);
    }
  } 
  else {
    message.reply('You need to provide the name of the list and the item to remove.');
  }
}

function PrefixLists() {
  const userLists = Object.keys(lists[userId]);
  if (userLists.length === 0) {
    message.reply('You have no lists.');
  } 
  else {
    const listNames = userLists.map(name => `• ${name} (${lists[userId][name].length} items)`).join('\n');
    message.reply(`Your Lists:\n${listNames}`);
  }
}

function PrefixRandom() {
  if (args.length > 1) {
    const listName = args[0];
    const excludedItems = args.slice(2).join(' ').split(',').map(item => item.trim());
    const targetList = lists[userId][listName];

    if (targetList) {
      const filteredList = targetList.filter(item => !excludedItems.includes(item));
      if (filteredList.length) {
        const randomIndex = Math.floor(Math.random() * filteredList.length);
        const randomItem = filteredList[randomIndex];
        message.reply(`Random item from list '${listName}' is '${randomItem}'.`);
      } 
      else {
        message.reply(`All items in list '${listName}' are excluded.`);
      }
    } 
    else {
      message.reply(`List '${listName}' does not exist.`);
    }
  } 
  else {
    message.reply('You need to provide the name of the list and at least one item to exclude.');
  }
}

function PrefixInList() {
  const listToDisplay = args[0];
  if (listToDisplay) {
    if (lists[userId][listToDisplay]) {
      const itemList = lists[userId][listToDisplay].join(', ');
      message.reply(`Items in list '${listToDisplay}': ${itemList}`);
    } 
    else {
      message.reply(`List '${listToDisplay}' does not exist.`);
    }
  } 
  else {
    message.reply('You need to provide the name of the list to display.');
  }
}
//#endregion

//#region interaction
function InteractionHelp() {
  interaction.reply(`The commands are:
    • \`${prefix}help\`: prints this list
    • \`${prefix}newlist <name>\`: Create a new list with the specified name.
    • \`${prefix}add <list name> <item>\`: Add an item to an existing list.
    • \`${prefix}remove <list name> <item>\`: Remove an item from an existing list.
    • \`${prefix}lists\`: Display the names of all existing lists.
    • \`${prefix}random <list name> [item, item, ...]\`: Get a random item from the specified list, excluding any items specified in the message.
    • \`${prefix}inlist <list name>\`: Display the items in the list specified in the message`);
}

function InteractionNewList() {
  const listName = interaction.options.getString('name');
  if (listName) {
    if (!lists[interaction.user.id][listName]) {
      lists[interaction.user.id][listName] = [];
      saveList(interaction.user.id, listName, ''); // Save an empty item to the database
      interaction.reply(`List '${listName}' created.`);
    } 
    else {
      interaction.reply(`List '${listName}' already exists.`);
    }
  } 
  else {
    interaction.reply('You need to provide a name for the new list.');
  }
}

function InteractionAdd() {
  const listToAdd = interaction.options.getString('list');
  const itemToAdd = interaction.options.getString('item');
  if (listToAdd && itemToAdd) {
    if (lists[interaction.user.id][listToAdd]) {
      lists[interaction.user.id][listToAdd].push(itemToAdd);
      saveList(interaction.user.id, listToAdd, itemToAdd); // Save the item to the database
      interaction.reply(`Item '${itemToAdd}' added to list '${listToAdd}'.`);
    } 
    else {
      interaction.reply(`List '${listToAdd}' does not exist.`);
    }
  } 
  else {
    interaction.reply('You need to provide the name of the list and the item to add.');
  }
}

function InteractionRemove() {
  const listToRemove = interaction.options.getString('list');
  const itemToRemove = interaction.options.getString('item');
  if (listToRemove && itemToRemove) {
    if (lists[interaction.user.id][listToRemove]) {
      const index = lists[interaction.user.id][listToRemove].indexOf(itemToRemove);
      if (index !== -1) {
        lists[interaction.user.id][listToRemove].splice(index, 1);
        interaction.reply(`Item '${itemToRemove}' removed from list '${listToRemove}'.`);
      } 
      else {
        interaction.reply(`Item '${itemToRemove}' not found in list '${listToRemove}'.`);
      }
    } 
    else {
      interaction.reply(`List '${listToRemove}' does not exist.`);
    }
  } 
  else {
    interaction.reply('You need to provide the name of the list and the item to remove.');
  }
}

function InteractionLists() {
  const userLists = Object.keys(lists[interaction.user.id]);
  if (userLists.length === 0) {
    interaction.reply('You have no lists.');
  } 
  else {
    const listNames = userLists.map(name => `• ${name} (${lists[interaction.user.id][name].length} items)`).join('\n');
    interaction.reply(`Your Lists:\n${listNames}`);
  }
}

function InteractionRandom() {
  const listName = interaction.options.getString('list');
  const excludedItems = interaction.options.getString('excludedItems');
  if (listName) {
    const targetList = lists[interaction.user.id][listName];
    if (targetList) {
      if (excludedItems) {
        const excludedItemsList = excludedItems.split(',').map(item => item.trim());
        const filteredList = targetList.filter(item => !excludedItemsList.includes(item));
        if (filteredList.length) {
          const randomIndex = Math.floor(Math.random() * filteredList.length);
          const randomItem = filteredList[randomIndex];
          interaction.reply(`Random item from list '${listName}' is '${randomItem}'.`);
        } 
        else {
          interaction.reply(`All items in list '${listName}' are excluded.`);
        }
      } 
      else {
        const randomIndex = Math.floor(Math.random() * targetList.length);
        const randomItem = targetList[randomIndex];
        interaction.reply(`Random item from list '${listName}' is '${randomItem}'.`);
      }
    } 
    else {
      interaction.reply(`List '${listName}' does not exist.`);
    }
  } 
  else {
    interaction.reply('You need to provide the name of the list.');
  }
}

function InteractionInLists() {
  const listToDisplay = interaction.options.getString('list');
  if (listToDisplay) {
    if (lists[interaction.user.id][listToDisplay]) {
      const itemList = lists[interaction.user.id][listToDisplay].join(', ');
      interaction.reply(`Items in list '${listToDisplay}': ${itemList}`);
    } 
    else {
      interaction.reply(`List '${listToDisplay}' does not exist.`);
    }
  } 
  else {
    interaction.reply('You need to provide the name of the list to display.');
  }
}
//#endregion


// loads the lists
function loadLists() {
  db.all('SELECT * FROM lists', (err, rows) => {
    if (err) {
      console.error(err);
      return;
    }

    rows.forEach(row => {
      const { userId, listName, item } = row;
      if (!lists[userId]) {
        lists[userId] = {};
      }
      if (!lists[userId][listName]) {
        lists[userId][listName] = [];
      }
      lists[userId][listName].push(item);
    });

    console.log('Lists loaded from the database.');
  });
}

// saves the list
function saveList(userId, listName, item) {
  db.run('INSERT INTO lists (userId, listName, item) VALUES (?, ?, ?)', [userId, listName, item], err => {
    if (err) {
      console.error(err);
      return;
    }

    console.log(`Item '${item}' added to list '${listName}' for user '${userId}'.`);
  });
}

// Connect to the database
function connectDatabase() {
  db = new sqlite3.Database(':memory:'); // You can specify a file path for a persistent database
  db.serialize(() => {
    // Create the 'lists' table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS lists (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId TEXT,
      listName TEXT,
      item TEXT
    )`);
  });
}

client.login(process.env.DISCORD_BOT_ID);