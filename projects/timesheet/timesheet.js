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
  
  console.log(minutes.toString());
  
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
		}
	}, 1000);
	
	updateMessage();
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
// TODO: Loop and figure out time worked
function calculateTimeWorked(timesheetLog, date) {
	if (timesheetLog.length === 0) {
		return 0;
	} else if (timesheetLog.length === 1) {
		return convertDateToMinutes(date) - parseStoredTime(getLastItem(timesheetLog)[1]);
	}
	let total = 0;
	for (i = 0; i < timesheetLog.length; i++) {
		
	}
}

// Update displayed message
// Need to add:
//   How long you've worked (clocked in) (done)
//   How long you've been on break (lunch break)
//   How long you worked (post clock out)
//   When you need to take next meal break (clocked in)
function updateMessage() {
	let timesheetLog = localStorage.getObj(storageKey);
	let date = new Date();
	if (timesheetLog.length === 0) {
		let greeting;
		if (date.getHours < 12) {
			greeting = "Good morning!";
		} else if (date.getHours < 17) {
			greeting = "Good afternoon!";
		} else {
			greeting = "Good evening!";
		}
		$('#currentMessage').html(`${greeting} You have not clocked in today.`);
	} else {
		let currentStatus = getLastItem(localStorage.getObj(storageKey))[0];
		if (currentStatus === dayIn) {
			let [hours, minutes] = convertTimeToPrettyTime(calculateTimeWorked(timesheetLog, date));
			$('#currentMessage').html(`You've worked for ${hours} hours and ${minutes} minutes today.`);
		}
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