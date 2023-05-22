require('dotenv').config();

const axios = require('axios');
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
const lists = {};


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

client.on('ready', () => {
  connectDatabase();
  loadLists();

  setInterval(() => {
    const index = Math.floor(Math.random() * (activities_list.length - 1) + 1);
    client.user.setActivity(activities_list[index].message);
  }, 100000);
});

client.on('messageCreate', async message => {
  if (message.author.bot) return;

  if (!message.content.startsWith(prefix)) return;

  const args = message.content.slice(prefix.length).trim().split(/ +/g);
  const command = args.shift().toLowerCase();
  const userId = message.author.id; // Get the user ID

  switch (command) {
    case 'help':
      message.reply(`The commands are:
    • \`${prefix}help\`: prints this list
    • \`${prefix}newlist <name>\`: Create a new list with the specified name.
    • \`${prefix}add <list name> <item>\`: Add an item to an existing list.
    • \`${prefix}remove <list name> <item>\`: Remove an item from an existing list.
    • \`${prefix}lists\`: Display the names of all existing lists.
    • \`${prefix}random <list name> [item, item, ...]\`: Get a random item from the specified list, excluding any items specified in the message.
    • \`${prefix}inlist <list name>\`: Display the items in the list specified in the message`);
      break;

    case 'newlist':
      const listName = args[0];
      if (listName) {
        if (!lists[userId]) {
          lists[userId] = {};
        }
        if (!lists[userId][listName]) {
          lists[userId][listName] = [];
          saveList(userId, listName, ''); // Save an empty item to the database
          message.reply(`List '${listName}' created.`);
        } else {
          message.reply(`List '${listName}' already exists.`);
        }
      } else {
        message.reply('You need to provide a name for the new list.');
      }
      break;

    case 'add':
      const listToAdd = args[0];
      const itemToAdd = args.slice(1).join(' ');
      if (listToAdd && itemToAdd) {
        if (!lists[userId]) {
          lists[userId] = {};
        }
        if (lists[userId][listToAdd]) {
          lists[userId][listToAdd].push(itemToAdd);
          saveList(userId, listToAdd, itemToAdd); // Save the item to the database
          message.reply(`Item '${itemToAdd}' added to list '${listToAdd}'.`);
        } else {
          message.reply(`List '${listToAdd}' does not exist.`);
        }
      } else {
        message.reply('You need to provide the name of the list and the item to add.');
      }
      break;
    
    case 'remove':
      const listToRemove = args[0];
      const itemToRemove = args.slice(1).join(' ');
      if (listToRemove && itemToRemove) {
        if (lists[userId] && lists[userId][listToRemove]) {
          const index = lists[userId][listToRemove].indexOf(itemToRemove);
          if (index !== -1) {
            lists[userId][listToRemove].splice(index, 1);
            message.reply(`Item '${itemToRemove}' removed from list '${listToRemove}'.`);
          } else {
            message.reply(`Item '${itemToRemove}' not found in list '${listToRemove}'.`);
          }
        } else {
          message.reply(`List '${listToRemove}' does not exist.`);
        }
      } else {
        message.reply('You need to provide the name of the list and the item to remove.');
      }
      break;
    
    case 'lists':
      if (!lists[userId]) {
        message.reply('You have no lists.');
      } else {
        const userLists = Object.keys(lists[userId]);
        if (userLists.length === 0) {
          message.reply('You have no lists.');
        } else {
          const listNames = userLists.map(name => `• ${name} (${lists[userId][name].length} items)`).join('\n');
          message.reply(`Your Lists:\n${listNames}`);
        }
      }
      break;
    
    case 'random':
      if (args.length > 1) {
        const listName = args[0];
        const excludedItems = args.slice(2).join(' ').split(',').map(item => item.trim());
        if (lists[userId] && lists[userId][listName]) {
          const targetList = lists[userId][listName];
          const filteredList = targetList.filter(item => !excludedItems.includes(item));
          if (filteredList.length) {
            const randomIndex = Math.floor(Math.random() * filteredList.length);
            const randomItem = filteredList[randomIndex];
            message.reply(`Random item from list '${listName}' is '${randomItem}'.`);
          } else {
            message.reply(`All items in list '${listName}' are excluded.`);
          }
        } else {
          message.reply(`List '${listName}' does not exist.`);
        }
      } else {
        message.reply('You need to provide the name of the list and at least one item to exclude.');
      }
      break;
    
    case 'inlist':
      const listToDisplay = args[0];
      if (listToDisplay) {
        if (lists[userId] && lists[userId][listToDisplay]) {
          const itemList = lists[userId][listToDisplay].join(', ');
          message.reply(`Items in list '${listToDisplay}': ${itemList}`);
        } else {
          message.reply(`List '${listToDisplay}' does not exist.`);
        }
      } else {
        message.reply('You need to provide the name of the list to display.');
      }
      break;
  }
});

client.login(process.env.DISCORD_BOT_ID);