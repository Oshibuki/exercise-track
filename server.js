const express = require('express')
const app = express()
const bodyParser = require('body-parser')

const cors = require('cors')

const mongoose = require('mongoose')
mongoose.connect(process.env.MLAB_URI, {
  useNewUrlParser: true
})

const User = require("./models")

app.use(cors())

app.use(bodyParser.urlencoded({
  extended: false
}))
app.use(bodyParser.json())


app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


//create new user
app.post("/api/exercise/new-user", async (req, res, next)=>{
  try {
    if (!req.body.username) {
      res.send("Paramter `username` is required.")
    } else {
      let existed = await User.exists({
        "username": req.body.username
      });
      if (existed) {
        res.send("username already taken")
      } else {
        let result = await User.create({
          "username": req.body.username
        });
        let {
          _id,
          username,
          __v
        } = result;
        res.json({
          "_id": _id,
          "username": username,
          "__v": __v
        })
      }
    }
  } catch (error) {
    console.error(`error while create user , ${error}`)
  }
});

//get all users
app.get('/api/exercise/users', async (req, res) => {
  try {
    let users = await User.find({}, "_id username __v")
    res.json(users)
  } catch (error) {
    console.error(`error while query all users , ${error}`)
  }
});

//add new exercise to existed user
app.post('/api/exercise/add', async (req, res) => {
  try {
    let created;
    //check params
    if (!req.body.userId || !(await User.exists({
        _id: req.body.userId
      }))) {
      res.send("unknown _id")
    }
    if (!req.body.description) {
      res.send("Param `description` is required.")
    }
    if (!req.body.duration) {
      res.send("Param `duration` is required.")
    }
    if (req.body.date) {
      if (/^(\d{4}|\d{2})-((1[0-2])|(0?[1-9]))-(([12][0-9])|(3[01])|(0?[1-9]))$/.test(req.body.date)) {
        created = (new Date(req.body.date)).getTime()
      } else {
        res.send("Param `date` is not right format")
      }
    } else {
      created = Date.now();
    }


    let user = await User.findOne({
      _id: req.body.userId
    });
    let exercise = {
      description: req.body.description,
      duration: req.body.duration,
      date: created
    }
    user.exercises.push(exercise)
    let updatedUser = await user.save()
    res.json({
      username: updatedUser.username,
      description: updatedUser.exercises[updatedUser.exercises.length - 1].description,
      duration: updatedUser.exercises[updatedUser.exercises.length - 1].duration,
      _id: updatedUser._id,
      date: (new Date(updatedUser.exercises[updatedUser.exercises.length - 1].date)).toDateString()
    })

  } catch (error) {
  }
});


app.get("/api/exercise/log", async (req, res, next) => {
  try {
    let from = new Date(req.query.from)
    from = (from != 'Invalid Date' ? from :  (new Date(0)))
    let to = new Date(req.query.to)
    to = (to != 'Invalid Date' ? to : (new Date()))
    const limit = req.query.limit?req.query.limit:1000
    console.log(from,to)
    let result =await User.aggregate().match({
      _id: req.query.userId
    })
    .unwind("$exercises")
    .match({
      'exercises.date': {
        $lte: to ,
        $gte: from
      }
    })
    .group({
      _id: "$_id",
      exercises: {
        $push: '$exercises'
      }
    })
    .project({
      'exercises._id':0 
    })
    .limit(parseInt(limit))
    .exec()
    let user = await User.findById(req.query.userId);
    let out = {
      _id:req.query.userId,
      username:user.username,
      count:result[0]["exercises"].length,
      log:result[0]["exercises"]
    }
    res.json(out)
  } catch (error) {
    
    console.error(`error while get log , ${error}`)
  }
  
})

// Not found middleware
app.use((req, res, next) => {
  return next({
    status: 404,
    message: 'not found'
  })
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})