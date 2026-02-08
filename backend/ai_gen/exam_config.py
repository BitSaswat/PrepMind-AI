"""
Exam configuration including syllabus and marking schemes.
Provides structured configuration with validation.
"""

from typing import Dict, List

# Comprehensive syllabus for JEE and NEET
SYLLABUS: Dict[str, Dict[str, List[str]]] = {
    "JEE": {
        "Physics": [
            "Kinematics",
            "Laws of Motion",
            "Work Energy Power",
            "Rotational Motion",
            "Gravitation",
            "Properties of Matter",
            "Thermodynamics",
            "Kinetic Theory of Gases",
            "Oscillations",
            "Waves",
            "Electrostatics",
            "Current Electricity",
            "Magnetic Effects of Current",
            "Electromagnetic Induction",
            "Alternating Current",
            "Electromagnetic Waves",
            "Optics",
            "Dual Nature of Matter",
            "Atoms and Nuclei",
            "Semiconductor Devices",
            "Communication Systems"
        ],
        "Chemistry": [
            "Atomic Structure",
            "Chemical Bonding",
            "States of Matter",
            "Thermodynamics",
            "Chemical Equilibrium",
            "Ionic Equilibrium",
            "Redox Reactions",
            "Electrochemistry",
            "Chemical Kinetics",
            "Surface Chemistry",
            "Periodic Table",
            "Hydrogen",
            "s-Block Elements",
            "p-Block Elements",
            "d-Block Elements",
            "f-Block Elements",
            "Coordination Compounds",
            "Metallurgy",
            "Organic Chemistry Basics",
            "Hydrocarbons",
            "Organic Compounds with Functional Groups",
            "Biomolecules",
            "Polymers",
            "Chemistry in Everyday Life"
        ],
        "Mathematics": [
            "Sets and Relations",
            "Functions",
            "Trigonometry",
            "Complex Numbers",
            "Quadratic Equations",
            "Sequences and Series",
            "Permutations and Combinations",
            "Binomial Theorem",
            "Limits",
            "Continuity",
            "Differentiation",
            "Applications of Derivatives",
            "Integration",
            "Applications of Integrals",
            "Differential Equations",
            "Vectors",
            "3D Geometry",
            "Matrices and Determinants",
            "Probability",
            "Statistics",
            "Mathematical Reasoning",
            "Linear Programming"
        ]
    },
    
    "NEET": {
        "Physics": [
            "Physical World and Measurement",
            "Kinematics",
            "Laws of Motion",
            "Work Energy Power",
            "Rotational Motion",
            "Gravitation",
            "Properties of Solids and Liquids",
            "Thermodynamics",
            "Kinetic Theory of Gases",
            "Oscillations and Waves",
            "Electrostatics",
            "Current Electricity",
            "Magnetic Effects of Current",
            "Magnetism and Matter",
            "Electromagnetic Induction",
            "Alternating Current",
            "Electromagnetic Waves",
            "Optics",
            "Dual Nature of Matter",
            "Atoms and Nuclei",
            "Electronic Devices"
        ],
        "Chemistry": [
            "Basic Concepts of Chemistry",
            "Atomic Structure",
            "Chemical Bonding",
            "States of Matter",
            "Thermodynamics",
            "Chemical Equilibrium",
            "Redox Reactions",
            "Hydrogen",
            "s-Block Elements",
            "p-Block Elements",
            "Organic Chemistry Basics",
            "Hydrocarbons",
            "Environmental Chemistry",
            "Solid State",
            "Solutions",
            "Electrochemistry",
            "Chemical Kinetics",
            "Surface Chemistry",
            "d and f Block Elements",
            "Coordination Compounds",
            "Haloalkanes and Haloarenes",
            "Alcohols Phenols and Ethers",
            "Aldehydes Ketones and Carboxylic Acids",
            "Organic Compounds with Nitrogen",
            "Biomolecules",
            "Polymers",
            "Chemistry in Everyday Life"
        ],
        "Botany": [
            "The Living World",
            "Biological Classification",
            "Plant Kingdom",
            "Morphology of Flowering Plants",
            "Anatomy of Flowering Plants",
            "Cell Structure and Function",
            "Cell Cycle and Division",
            "Transport in Plants",
            "Mineral Nutrition",
            "Photosynthesis",
            "Respiration in Plants",
            "Plant Growth and Development",
            "Reproduction in Organisms",
            "Sexual Reproduction in Flowering Plants",
            "Principles of Inheritance",
            "Molecular Basis of Inheritance",
            "Strategies for Enhancement in Food Production",
            "Organisms and Populations",
            "Ecosystem",
            "Biodiversity and Conservation",
            "Environmental Issues"
        ],
        "Zoology": [
            "Animal Kingdom",
            "Structural Organization in Animals",
            "Biomolecules",
            "Digestion and Absorption",
            "Breathing and Exchange of Gases",
            "Body Fluids and Circulation",
            "Excretory Products and Elimination",
            "Locomotion and Movement",
        "Chemical Coordination",
            "Human Reproduction",
            "Reproductive Health",
            "Evolution",
            "Human Health and Disease",
            "Microbes in Human Welfare",
            "Biotechnology Principles",
            "Biotechnology Applications"
        ]
    },

    "UPSC": {
        "History": [
            "Ancient India: Prehistoric Cultures to Later Vedic Period",
            "Ancient India: Mauryan and Post-Mauryan Empire",
            "Early Medieval India: Dynasties and Culture",
            "Medieval India: Delhi Sultanate and Mughal Empire",
            "Modern India: Advent of Europeans and British Expansion",
            "Modern India: Revolt of 1857 and Social Reform Movements",
            "Modern India: Indian National Movement and Freedom Struggle",
            "Art and Culture: Architecture, Sculpture, Paintings",
            "Art and Culture: Music, Dance, Theatre, Literature"
        ],
        "Geography": [
            "Physical Geography: Geomorphology (Landforms)",
            "Physical Geography: Climatology (Atmosphere)",
            "Physical Geography: Oceanography (Hydrosphere)",
            "World Geography: Continents and Resources",
            "Indian Geography: Physiography and Drainage System",
            "Indian Geography: Climate, Soils, and Natural Vegetation",
            "Indian Geography: Agriculture and Irrigation",
            "Indian Geography: Mineral and Energy Resources",
            "Indian Geography: Industries and Transport",
            "Human Geography: Demography and Urbanization"
        ],
        "Polity": [
            "Constitutional Framework: Making of Constitution",
            "Preamble, Fundamental Rights, DPSP, Fundamental Duties",
            "Union Government: Executive (President, PM) and Parliament",
            "State Government: Governor, CM, State Legislature",
            "Judiciary: Supreme Court, High Courts, Subordinate Courts",
            "Local Government: Panchayati Raj and Municipalities",
            "Federalism and Centre-State Relations",
            "Constitutional Bodies (EC, UPSC, CAG etc.)",
            "Non-Constitutional Bodies (NITI Aayog, NHRC etc.)",
            "Governance and Public Policy"
        ],
        "Economy": [
            "National Income Accounting and GDP",
            "Inflation: Types, Causes, and Control",
            "Banking System and Monetary Policy (RBI)",
            "Fiscal Policy and Budgeting",
            "Planning and NITI Aayog",
            "Agriculture and Food Processing",
            "Industry and Infrastructure",
            "External Sector: Balance of Payments and Trade",
            "International Economic Organizations (IMF, WB, WTO)",
            "Social Sector: Poverty, Employment, Inequality"
        ],
        "General Science": [
            "Physics: Mechanics, Heat, Light, Sound, Electricity",
            "Chemistry: Elements, Compounds, Acids-Bases, Carbon",
            "Biology: Cell Structure, Human Physiology, Diseases",
            "Space Technology and Indian Space Program",
            "Defense Technology and Missiles",
            "Information Technology and Computers",
            "Nanotechnology and Biotechnology",
            "Recent Scientific Developments"
        ],
        "Environment": [
            "Ecology: Ecosystems, Food Chains, Biomes",
            "Biodiversity: Conservation, Hotspots, Protected Areas",
            "Climate Change: Greenhouse Effect, Global Warming",
            "Environmental Pollution and Control",
            "International Environmental Conventions and Treaties",
            "Indian Environmental Laws and Acts",
            "Sustainable Development"
        ],
        "Current Affairs": [
            "National News: Major Events and Government Schemes",
            "International Relations: Summits and Geopolitics",
            "Awards and Honours",
            "Sports and Games",
            "Science and Technology Updates",
            "Economy Updates and Indices",
            "Environment and Ecology News",
            "Committees and Commissions"
        ]
    },

    "CSAT": {
        "Reading Comprehension": [
            "Passages: Inferences and Assumptions",
            "Passages: Social and Economic Issues",
            "Passages: Moral and Ethical Issues",
            "Passages: Scientific and Ecological Issues"
        ],
        "Quantitative Aptitude": [
            "Number System and Basic Numeracy",
            "HCF and LCM",
            "Percentages",
            "Averages",
            "Ratio and Proportion",
            "Profit and Loss",
            "Time and Work",
            "Speed, Time and Distance",
            "Permutation and Combination",
            "Probability",
            "Mensuration (Area and Volume)"
        ],
        "Logical Reasoning": [
            "General Mental Ability",
            "Logical Deduction and Syllogism",
            "Seating Arrangement and Puzzles",
            "Blood Relations",
            "Direction Sense Test",
            "Series Completion (Number and Letter)",
            "Coding and Decoding",
            "Clocks and Calendars",
            "Data Sufficiency"
        ],
        "Data Interpretation": [
            "Charts (Bar, Pie, Line)",
            "Graphs and Tables",
            "Data Sufficiency"
        ]
    }
}


# Marking schemes for different exams
MARKING_SCHEME: Dict[str, Dict[str, int]] = {
    "JEE": {
        "correct": 4,
        "wrong": -1,
        "unattempted": 0
    },
    "NEET": {
        "correct": 4,
        "wrong": -1,
        "unattempted": 0
    },
    "UPSC": {
        "correct": 2,
        "wrong": -0.66,
        "unattempted": 0
    },
    "CSAT": {
        "correct": 2.5,
        "wrong": -0.83,
        "unattempted": 0
    }
}


# Difficulty levels
DIFFICULTY_LEVELS = ["Easy", "Medium", "Hard"]


def get_subjects(exam: str) -> List[str]:
    """Get list of subjects for an exam."""
    return list(SYLLABUS.get(exam, {}).keys())


def get_chapters(exam: str, subject: str) -> List[str]:
    """Get list of chapters for a subject."""
    return SYLLABUS.get(exam, {}).get(subject, [])


def get_marking_scheme(exam: str) -> Dict[str, int]:
    """Get marking scheme for an exam."""
    return MARKING_SCHEME.get(exam, MARKING_SCHEME["JEE"])


def is_valid_exam(exam: str) -> bool:
    """Check if exam type is valid."""
    return exam in SYLLABUS


def is_valid_subject(exam: str, subject: str) -> bool:
    """Check if subject is valid for the exam."""
    return subject in SYLLABUS.get(exam, {})


def is_valid_chapter(exam: str, subject: str, chapter: str) -> bool:
    """Check if chapter is valid for the subject."""
    return chapter in SYLLABUS.get(exam, {}).get(subject, [])
