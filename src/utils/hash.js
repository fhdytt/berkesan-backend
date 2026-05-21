const bcrypt = require("bcryptjs");

bcrypt.hash("12344321", 10).then(console.log);