const fs = require('fs');
const files = [
    { name: '第一冊 L1-3', path: 'data.json' },
    { name: '第一冊 L4-6', path: 'data_book1_units4-6.json' },
    { name: '第二冊 L1-2', path: 'data_book2_units1-2.json' },
    { name: '第二冊 L3-4', path: 'data_book2_units3-4.json' },
    { name: '第二冊 L5-6', path: 'data_book2_units5-6.json' },
    { name: '第三冊 L1-2', path: 'data_book3_units1-2.json' },
    { name: '第三冊 L3-4', path: 'data_book3_units3-4.json' },
    { name: '第三冊 L5-6', path: 'data_book3_units5-6.json' },
    { name: '第四冊 L1-2', path: 'data_book4_units1-2.json' },
    { name: '第四冊 L3-4', path: 'data_book4_units3-4.json' },
    { name: '第四冊 L5-6', path: 'data_book4_units5-6.json' },
    { name: '第五冊 L1-2', path: 'data_book5_units1-2.json' },
    { name: '第五冊 L3-4', path: 'data_book5_units3-4.json' },
    { name: '第五冊 L5-6', path: 'data_book5_units5-6.json' },
    { name: '第六冊 L1-2', path: 'data_book6_units1-2.json' },
    { name: '第六冊 L3-4', path: 'data_book6_units3-4.json' }
];

files.forEach(file => {
    try {
        if (fs.existsSync(file.path)) {
            const content = fs.readFileSync(file.path, 'utf8');
            const data = JSON.parse(content);
            console.log(`${file.name}: ${Array.isArray(data) ? data.length : 'Not an array'}`);
        } else {
            console.log(`${file.name}: File not found (${file.path})`);
        }
    } catch (e) {
        console.log(`${file.name}: Error - ${e.message}`);
    }
});
