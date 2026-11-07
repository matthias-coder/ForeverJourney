MyCharForeverDB = {
	["debug"] = true,
}
MyCharForeverExportDB = {
	["format"] = "MyCharForever",
	["exportVersion"] = 3,
	["addonVersion"] = "1.1.4.1",
	["exportedAt"] = 1793998860,
	["locale"] = "deDE",
	["maps"] = {
		[1426] = {
			["name"] = "Dun Morogh",
			["parent"] = 1414,
		},
		[1432] = {
			["name"] = "Loch Modan",
			["parent"] = 1414,
		},
	},
	["meta"] = {
		["name"] = "Thorgrim",
		["realm"] = "Eisenbart",
		["displayName"] = "Thorgrim-Eisenbart",
		["faction"] = "Alliance",
		["class"] = "WARRIOR",
		["race"] = "Dwarf",
		["utcOffset"] = 3600,
		["profileKey"] = "SECRET",
		["screenshotFormat"] = "jpg",
		["client"] = {
			["flavor"] = "forever",
		},
	},
	["data"] = {
		["character"] = {
			["created"] = 1791792000,
		},
		["levels"] = {
			{
				["firstSeen"] = 1791792000,
				["duration"] = 3600,
				["zone"] = "Dun Morogh",
				["mapID"] = 1426,
			}, -- [1]
			{
				["firstSeen"] = 1791795600,
				["duration"] = 3600,
				["zone"] = "Dun Morogh",
				["mapID"] = 1426,
			}, -- [2]
			{
				["firstSeen"] = 1791799200,
				["duration"] = 0,
				["zone"] = "Dun Morogh",
				["mapID"] = 1426,
			}, -- [3]
		},
		["levelSnapshots"] = {
			[1] = {
				["level"] = 1,
				["playedTotal"] = 0,
			},
			[2] = {
				["level"] = 2,
				["playedTotal"] = 7200,
				["money"] = 11208,
			},
		},
		["levelActivity"] = {
			[3] = {
				["deaths"] = {
					{
						["cause"] = "fall",
					}, -- [1]
				},
			},
		},
		["events"] = {
			{
				["time"] = 1791830400,
				["type"] = "LOGIN",
			}, -- [1]
			{
				["time"] = 1791830651,
				["type"] = "LEVEL_UP",
				["level"] = 2,
				["note"] = "Hogger \"der Schreckliche\"",
			}, -- [2]
			{
				["time"] = 1791831200,
				["type"] = "DEATH",
				["delta"] = -15,
				["ratio"] = 0.0070,
			}, -- [3]
			{
				["time"] = 1791834000,
				["type"] = "LOGOUT",
			}, -- [4]
		},
		["sessions"] = {
			{
				["startTime"] = 1791830400,
				["endTime"] = 1791834000,
				["duration"] = 3600,
				["levelStart"] = 1,
				["levelEnd"] = 3,
				["zoneStart"] = "Dun Morogh",
				["zoneEnd"] = "Dun Morogh",
			}, -- [1]
		},
		["journal"] = {
			{
				["auto"] = true,
				["source"] = "FIRST_DEATH",
				["time"] = 1791831200,
			}, -- [1]
		},
		["screenshots"] = {
			{
				["expectedFileName"] = "WoWScrnShot_101226_204411.jpg",
				["reason"] = "LEVEL_UP",
				["level"] = 2,
				["zone"] = "Dun Morogh",
				["mapID"] = 1426,
				["time"] = 1791830651,
			}, -- [1]
			{
				["expectedFileName"] = "WoWScrnShot_101226_210000.jpg",
				["reason"] = "PORTRAIT",
				["portrait"] = {
					["zoom"] = 1.6,
					["x"] = 50,
					["y"] = 30,
				},
				["time"] = 1791831600,
			}, -- [2]
		},
		["dungeons"] = {
		},
		["goldHistory"] = {
			["2026-10-12"] = {
				["first"] = 0,
				["last"] = 11208,
				["min"] = 0,
				["max"] = 11208,
				["level"] = 3,
				["firstTime"] = 1791830400,
				["lastTime"] = 1791834000,
			},
		},
		["journey"] = {
			["format"] = 2,
			["fields"] = {
				"time", -- [1]
				"mapID", -- [2]
				"x", -- [3]
				"y", -- [4]
				"flags", -- [5]
			},
			["segments"] = {
				{
					{
						1791830400, -- [1]
						1426, -- [2]
						0.4, -- [3]
						0.5, -- [4]
						1, -- [5]
					}, -- [1]
					{
						1791830460, -- [1]
						1426, -- [2]
						0.41, -- [3]
						0.52, -- [4]
						1, -- [5]
					}, -- [2]
				}, -- [1]
			},
		},
		["fun"] = {
		},
		["companions"] = {
			["people"] = {
				["brannok"] = {
					["name"] = "Brannok",
					["groups"] = 3,
				},
			},
		},
		["settings"] = {
			["x"] = 1,
		},
	},
}
