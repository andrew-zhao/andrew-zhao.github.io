const storageKey = "timesheetLog";
const dayIn = "day_in";
const dayOut = "day_out";
const mealIn = "lunch_in";
const mealOut = "lunch_out";

const debug = true;

Storage.prototype.setObj = function(key, obj) {
    return this.setItem(key, JSON.stringify(obj))
}

Storage.prototype.getObj = function(key) {
    return JSON.parse(this.getItem(key))
}

function prettyTime(hours, minutes) {
  let meridiem = "am";
  if (hours >= 12) {
    meridiem = "pm";
  }
  
  if (hours > 12) {
    hours -= 12;
  }
  
  if (minutes < 10) {
    minutes = minutes.toString().padStart(2, "0");
  }
  
  return `${hours}:${minutes} ${meridiem}`
};

function dateLoop() {
	let intervalID = setInterval(function () {
		let date = new Date();
		if (date.getSeconds() === 0) {
			$("#currentTime").text(prettyTime(date.getHours(), date.getMinutes()));
			updateMessage();
		}
	}, 1000);
};

function getLastItem(arr) {
	if (arr.length === 0) {
		return null;
	}
	return arr[arr.length - 1];
}

/*************************
 * Time update functions *
 *************************/


// Store time in local storage
function storeTime(storageKey, buttonValue, inputTime) {
	let timesheetLog = localStorage.getObj(storageKey);
	timesheetLog.push([buttonValue, inputTime]);
	localStorage.setObj(storageKey, timesheetLog);
}

// Parses time in format hh:mm and returns total minutes
function parseStoredTime(time) {
	let hours = parseInt(time.substring(0,2));
	let minutes = parseInt(time.substring(3,5));
	return 60 * hours + minutes;
}

// Convert minutes to hours and minutes
function convertTimeToPrettyTime(minutes) {
	return [Math.floor(minutes/60), minutes % 60];
}

// Convert date to input time
function convertDateToMinutes(date) {
	return 60 * date.getHours() + date.getMinutes();
}

// Calculates total time worked and returns total minutes
// Validation already performed in logTime
// TODO: Loop and figure out time worked
function calculateTimeWorked(timesheetLog, date) {
	if (timesheetLog.length === 0) {
		return 0;
	} else if (timesheetLog.length === 1) {
		return convertDateToMinutes(date) - parseStoredTime(getLastItem(timesheetLog)[1]);
	}
	let total = 0;
	for (i = 1; i < timesheetLog.length; i++) {
		if (i % 2 === 1) {
			total += (parseStoredTime(timesheetLog[i][1]) - parseStoredTime(timesheetLog[i-1][1]));
		}
	}
	if (timesheetLog.length % 2 === 1) {
		total += convertDateToMinutes(date) - parseStoredTime(getLastItem(timesheetLog)[1]);
	}
	return total;
}

// Check if a meal break was taken
function mealBreakExists(timesheetLog) {
	let breakStart = false;
	let breakEnd = false;
	for (i = 0; i < timesheetLog.length; i++) {
		if (timesheetLog[i][0] === mealIn) {
			breakEnd = true;
		} else if (timesheetLog[i][0] === mealOut) {
			breakStart = true;
		}
		if (breakStart && breakEnd) {
			return true;
		}
	}
	return false;
}

// Generate a message to estimate when to clock out at the end of the day
function endOfDayMessage(hours, minutes, date, timesheetLog) {
	let remainingMinutes = 60 - minutes;
	let remainingHours = 8 - hours;
	if (remainingMinutes > 0) {
		remainingHours -= 1;
	}
	
	if (!mealBreakExists(timesheetLog)) {
		remainingMinutes += 30;
	}
	
	let endOfDayHours = date.getHours() + remainingHours;
	let endOfDayMinutes = date.getMinutes() + remainingMinutes;
	
	while (endOfDayMinutes >= 60){
		endOfDayMinutes -= 60;
		endOfDayHours += 1;
	}
	
	return `Estimated end of day is ${prettyTime(endOfDayHours, endOfDayMinutes)}.`;
}

// Update displayed message
// Need to add:
//   How long you've worked (clocked in) (done)
//   How long you've been on break (lunch break) (done)
//   How long you worked (post clock out) (done)
//   When you need to take next meal break (clocked in)
//   How long you were on lunch break (after lunch break) (done)
//   How long until 2nd lunch break
function updateMessage() {
	let timesheetLog = localStorage.getObj(storageKey);
	let date = new Date();
	if (timesheetLog.length === 0) {
		let greeting;
		if (date.getHours() < 12) {
			greeting = "Good morning!";
		} else if (date.getHours() < 17) {
			greeting = "Good afternoon!";
		} else {
			greeting = "Good evening!";
		}
		$('#currentMessage').html(`${greeting} You have not clocked in today.`);
	} else {
		let currentStatus = getLastItem(localStorage.getObj(storageKey))[0];
		let [hours, minutes] = convertTimeToPrettyTime(calculateTimeWorked(timesheetLog, date));
		let message;
		if (currentStatus === dayIn) {
			message = `You've worked for ${hours} hours and ${minutes} minutes today.`;
			if (hours < 8) {
				message += ` ${endOfDayMessage(hours, minutes, date, timesheetLog)}`;
			}
		} else if (currentStatus === mealOut) {
			let [mealHours, mealMinutes] = convertTimeToPrettyTime(convertDateToMinutes(date)
																	- parseStoredTime(getLastItem(timesheetLog)[1]));
			if (mealHours > 0) {
				message = `You've been on break for ${mealHours} hours and ${mealMinutes} minutes.`;
			} else {
				message = `You've been on break for ${mealMinutes} minutes.`;
			}
		} else if (currentStatus === mealIn) {
			message = `You've worked for ${hours} hours and ${minutes} minutes today.`
			let [mealHours, mealMinutes] = convertTimeToPrettyTime(parseStoredTime(getLastItem(timesheetLog)[1])
																	- parseStoredTime(timesheetLog[timesheetLog.length - 2][1]));
			if (mealHours > 0) {
				message += ` Your last break was ${mealHours} hours and ${mealMinutes} minutes long.`;
			} else {
				message += ` Your last break was ${mealMinutes} minutes long.`;
			}
			
			if (hours < 8) {
				message += ` ${endOfDayMessage(hours, minutes, date, timesheetLog)}`;
			}
		} else if (currentStatus === dayOut) {
			message = `You worked ${hours} hours and ${minutes} minutes during your last shift. Thanks for your hard work!`;
		}
		
		$('#currentMessage').html(message);
	}
	
}

function raiseError(buttonValue) {
	console.log(`Invalid input '${buttonValue}'`);
}


// Define time button behavior
function logTime(timeButton) {
	let buttonValue = timeButton.value;
	let inputTime = $('#inputTime').val();
	let lastLogItem = getLastItem(localStorage.getObj(storageKey));
	if (debug === true) {
		console.log(`Button value: ${buttonValue}`);
		console.log(`Input time: ${inputTime}`);
	}
	
	// Validate button press
	switch(buttonValue) {
		case dayIn:
			if (lastLogItem && lastLogItem[0] != dayOut) {
				return raiseError(buttonValue);
			}
			break;
		case dayOut:
			if (!lastLogItem || (lastLogItem[0] != dayIn && lastLogItem[0] != mealIn)) {
				return raiseError(buttonValue);
			}
			break;
		case mealIn:
			if (!lastLogItem || lastLogItem[0] != mealOut) {
				return raiseError(buttonValue);
			}
			break;
		case mealOut:
			if (!lastLogItem || (lastLogItem[0] != dayIn && lastLogItem[0] != mealIn)) {
				return raiseError(buttonValue);
			}
			break;
		default:
			return raiseError(null);
	}
	
	storeTime(storageKey, buttonValue, inputTime);
	updateMessage();
}

/*********************
 * Startup functions *
 *********************/

$( document ).ready(function() {
	// Initialize time
	let date = new Date();
	$("#currentTime").text(prettyTime(date.getHours(), date.getMinutes()));
	
	// Initialize localStorage
	if (localStorage.getItem(storageKey) === null || debug === true) {
		localStorage.setObj(storageKey, new Array());
	}
	
	updateMessage();
	
	// Start looping
	dateLoop();
	
});