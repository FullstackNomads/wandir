const router = require('express').Router();
const { Event, User, Message } = require('../models');
const withAuth = require('../utils/auth');
// needed to make findAll more specific to what we need for messages
const Op = require('Sequelize').Op


function getUniqueListBy(arr, key) {
  return [...new Map(arr.map(item => [item[key], item])).values()]
}


router.get('/', async (req, res) => {
  console.log(`HOMEPAGE "/" ROUTE SLAPPED`)
  console.log(req.session.logged_in)
  if (req.session.logged_in) {
    res.render('userDashboard', {
      logged_in: req.session.logged_in
    });
  } else {
    res.render('homepage', {
      logged_in: req.session.logged_in
    });
  }
});


router.get('/about', async (req, res) => {
  console.log(`GET "/about" ROUTE SLAPPED`)
  res.render('about', {});
});



router.get('/user/:id', async (req, res) => {
  console.log(`GET /user/${req.params.id} ROUTE SLAPPED`)
  try {
    const profileData = await User.findByPk(req.params.id, {});

    const eventData = await Event.findAll({
      where: {
        creator_id: req.params.id
      }
    });
    const events = eventData.map((event) => event.get({ plain: true }));
    const user = profileData.get({ plain: true });

    res.render('userProfile', {
      ...user,
      events: events,
      sameUser: req.params.id == req.session.user_id,
      logged_in: req.session.logged_in
    });
    console.log('Single user successfully loaded')
  } catch (err) {
    res.status(500).json(err);
  }
});


router.get('/events/:id', async (req, res) => {
  console.log(`\n\nGET /events/${req.params.id} ROUTE SLAPPED\n\n`)
  try {
    const eventData = await Event.findByPk(req.params.id, {
      include: [
        {
          model: User,
          attributes: ['first_name', 'last_name'],
        },
      ],
    });

    const creatorData = await User.findByPk(eventData.creator_id)

    const event = eventData.get({ plain: true });
    res.render('singleEvent', {
      ...event,
      logged_in: req.session.logged_in,
      creatorName: `${creatorData.first_name} ${creatorData.last_name}`
    });
    console.log('Single event successfully loaded')
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get('/searchEvents', async (req, res) => {
  console.log(`GET /searchEvents ROUTE SLAPPED`)
  res.render('searchEvents', {
    logged_in: req.session.logged_in
  });
});

router.get('/userDashboard', async (req, res) => {
  console.log(`GET /userDashboard ROUTE SLAPPED`)
  res.render('userDashboard', {
    logged_in: req.session.logged_in
  });
});

// Route to get all messages 
router.get('/messages', withAuth, async (req, res) => {
  console.log(`GET /messages ROUTE SLAPPED`)
  try {
    // Get all messages where i am the sender or receiver 
    const messageData = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: req.session.user_id }, { receiver_id: req.session.user_id }
        ]
      }
    });


    // Serialize data so the template can read it
    let messages = messageData.map((message) => message.get({ plain: true }));


    // For each message, store the other person id in ["user"]
    for (i = 0; i < messages.length; i++) {
      console.log(messages[i]);
      if (messages[i].sender_id != req.session.user_id) {
        messages[i]["user"] = messages[i].sender_id
      }
      if (messages[i].receiver_id != req.session.user_id) {
        messages[i]["user"] = messages[i].receiver_id
      }
    }
    // filter the messages to get only the unique users that has have some sort of communication with me
    messages = getUniqueListBy(messages, "user")

    // Pass serialized data and session flag into template
    res.render('message', {
      messages,
      userId: req.session.user_id,
      logged_in: req.session.logged_in
    });
  } catch (err) {
    res.status(500).json(err);
  }
});

router.get('/messages/:id', withAuth, async (req, res) => {
  console.log(`GET /messages ROUTE SLAPPED`)
  try {
    // Get all messages
    const messageData = await Message.findAll({
      where: {
        [Op.or]: [
          { sender_id: req.session.user_id }, { receiver_id: req.session.user_id }
        ]
      }
    });

    // Example:
    // John (id=1) sends a message to Bill (id=2) with message content: Hello 
    // Bill(id=2) sends a message to John(id=1) with message content: Hi there
    // If we want to get all messages between John and bill to display them in the page, 
    // We need to query our database and ask it for the following:
    // o	Give me all messages where the sender is 1 and receiver is 2
    // o	And
    // o	Give me all messages where the sender is 2 and receiver 1
    const messageBetweenData = await Message.findAll({
      where: {
        [Op.or]: [
          { [Op.and]: [{ sender_id: req.session.user_id }, { receiver_id: req.params.id }] },
          { [Op.and]: [{ sender_id: req.params.id }, { receiver_id: req.session.user_id }] },
        ]
      },
      order: [['createdAt', 'ASC']]
    })

    // Serialize data so the template can read it
    let messages = messageData.map((message) => message.get({ plain: true }));
    for (i = 0; i < messages.length; i++) {
      console.log(messages[i]);
      if (messages[i].sender_id != req.session.user_id) {
        messages[i]["user"] = messages[i].sender_id
      }
      if (messages[i].receiver_id != req.session.user_id) {
        messages[i]["user"] = messages[i].receiver_id
      }
    }
    messages = getUniqueListBy(messages, "user")


    const messagesBetween = messageBetweenData.map((message) => message.get({ plain: true }));

    // Pass serialized data and session flag into template
    res.render('message', {
      messages,
      messagesBetween,
      specific_user: true,
      userId: req.session.user_id,
      logged_in: req.session.logged_in
    });
  } catch (err) {
    res.status(500).json(err);
  }
});


router.get('/createEvent', async (req, res) => {
  console.log(`GET /createEvent ROUTE SLAPPED`)
  res.render('createEvent', {
    logged_in: req.session.logged_in
  });
});


router.get('/searchUsers', async (req, res) => {
  console.log(`GET /searchUsers ROUTE SLAPPED`)
  try {
    // Get all events and JOIN with user data
    const userData = await User.findAll({});

    // Serialize data so the template can read it
    const users = userData.map((user) => user.get({ plain: true }));

    // Pass serialized data and session flag into template
    res.render('searchUsers', {
      users,
      logged_in: req.session.logged_in
    });
  } catch (err) {
    res.status(500).json(err);
  }
});


router.get('/createProfile', async (req, res) => {
  console.log(`GET /createProfile ROUTE SLAPPED`);
  try {
    res.status(200).render('createProfile');
  } catch (err) {
    res.status(500).json(err);
  }
});


router.get('/user', withAuth, async (req, res) => {
  console.log(`GET /user ROUTE SLAPPED`);
  try {
    // Find the logged in user based on the session ID
    const userData = await User.findByPk(req.session.user_id, {
      attributes: { exclude: ['password'] },
      // include: [{ model: Event }],
    });
    const eventData = await Event.findAll({
      where: {
        creator_id: req.session.user_id
      }
    });
    // const events = eventData.map((event) => event.get({ plain: true }));
    const user = userData.get({ plain: true });
    const events = eventData.map((event) => event.get({ plain: true }));

    res.render('userProfile', {
      ...user,
      events: events,
      sameUser: true,
      logged_in: true
    });
  } catch (err) {
    res.status(500).json(err);
  }
});


// THIS ROUTE ONLY RETURNS THE LOGIN PAGE. IT DOES NOT ACTUALLY SEND THE EMAIL AND PASS FOR LOGIN VALIDATION. THAT IS IN THE API ROUTES.
router.get('/login', (req, res) => {
  console.log(`GET /login ROUTE SLAPPED`);
  console.log(req.body)
  // If the user is already logged in, redirect the request to another route
  if (req.session.logged_in) {

    res.redirect('/userDashboard');
    return;
  }

  res.render('login');
  console.log('Log in page successfully loaded')
});

module.exports = router;
