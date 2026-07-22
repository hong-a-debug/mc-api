const { JavaServer, BedrockServer } = require('mcstatus');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { host, port, bedrock } = req.query;

  if (!host) {
    return res.status(400).json({ 
      success: false, 
      error: '缺少 host 参数' 
    });
  }

  const isBedrock = bedrock === 'true';
  const portNum = parseInt(port) || (isBedrock ? 19132 : 25565);

  try {
    let result;

    if (isBedrock) {
      const server = new BedrockServer(host, portNum);
      result = await server.status();
      
      return res.json({
        success: true,
        online: true,
        edition: 'Bedrock',
        version: result.version || '未知',
        players: result.players?.online || 0,
        maxPlayers: result.players?.max || 0,
        motd: result.motd || '无',
        gamemode: result.gamemode || '未知',
        latency: result.latency || 0,
        host: host,
        port: portNum
      });
    } else {
      const server = JavaServer.lookup(`${host}:${portNum}`);
      const status = await server.status();
      
      let playerList = [];
      let plugins = [];
      try {
        const query = await server.query();
        playerList = query.players?.names || [];
        plugins = query.plugins || [];
      } catch (e) {}

      return res.json({
        success: true,
        online: true,
        edition: 'Java',
        version: status.version?.name || '未知',
        protocol: status.version?.protocol || 0,
        players: status.players?.online || 0,
        maxPlayers: status.players?.max || 0,
        motd: status.motd?.clean?.join(' ') || status.motd?.raw || '无',
        playerList: playerList,
        plugins: plugins,
        latency: Math.round(status.latency || 0),
        favicon: status.favicon || null,
        host: host,
        port: portNum
      });
    }

  } catch (error) {
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return res.json({
        success: false,
        online: false,
        error: '服务器离线或无法连接'
      });
    }
    
    return res.json({
      success: false,
      online: false,
      error: error.message || '查询失败'
    });
  }
};
