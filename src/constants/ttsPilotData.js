const lesson133Audio = {
    after: '001-after',
    although: '002-although',
    and: '003-and',
    as: '004-as',
    because: '005-because',
    before: '006-before',
    but: '007-but',
    'either or': '008-either-or',
    if: '009-if',
    'neither nor': '010-neither-nor',
    or: '011-or',
    since: '012-since',
    so: '013-so',
    'so... that': '014-so-that',
    then: '015-then',
    when: '016-when',
    while: '017-while'
};

export const getAdvancedLesson133Audio = (word = '') => {
    const filename = lesson133Audio[String(word).trim().toLowerCase()];
    if (!filename) return null;

    const basePath = '/audio/tts/advanced/lesson-133';
    return {
        marin: `${basePath}/marin/${filename}.mp3`,
        cedar: `${basePath}/cedar/${filename}.mp3`
    };
};
