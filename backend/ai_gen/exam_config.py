# backend/exam_config.py

SYLLABUS = {
    "JEE": {
        "Physics": [
            "Kinematics",
            "Laws of Motion",
            "Work Energy Power",
            "Electrostatics"
        ],
        "Chemistry": [
            "Thermodynamics",
            "Atomic Structure",
            "Chemical Bonding"
        ],
        "Mathematics": [
            "Limits",
            "Continuity",
            "Differentiation",
            "Integration"
        ]
    },

    "NEET": {
        "Physics": [
            "Kinematics",
            "Laws of Motion",
            "Current Electricity"
        ],
        "Chemistry": [
            "Thermodynamics",
            "Chemical Bonding"
        ],
        "Biology": [
            "Cell Biology",
            "Genetics",
            "Human Physiology"
        ]
    }
}

MARKING_SCHEME = {
    "JEE": {
        "correct": 4,
        "wrong": -1,
        "unattempted": 0
    },
    "NEET": {
        "correct": 4,
        "wrong": -1,
        "unattempted": 0
    }
}
