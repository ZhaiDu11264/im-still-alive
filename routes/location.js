const express = require('express');
const { Country, State } = require('country-state-city');

const router = express.Router();

// 获取所有国家列表
router.get('/countries', (req, res) => {
    try {
        const countries = Country.getAllCountries();
        // 返回简化的国家数据
        const simplifiedCountries = countries.map(country => ({
            code: country.isoCode,
            name: country.name,
            nativeName: country.name
        }));
        res.json(simplifiedCountries);
    } catch (error) {
        console.error('获取国家列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

// 根据国家代码获取州/省列表
router.get('/states/:countryCode', (req, res) => {
    try {
        const { countryCode } = req.params;

        if (!countryCode) {
            return res.status(400).json({ error: '国家代码不能为空' });
        }

        const states = State.getStatesOfCountry(countryCode);

        // 返回简化的州/省数据
        const simplifiedStates = states.map(state => ({
            code: state.isoCode,
            name: state.name
        }));

        res.json(simplifiedStates);
    } catch (error) {
        console.error('获取州/省列表错误:', error);
        res.status(500).json({ error: '服务器错误' });
    }
});

module.exports = router;
