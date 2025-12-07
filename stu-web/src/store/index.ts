// store/index.js
import { createStore } from 'vuex';

export default createStore({
  state: {
    buildings: [
      {
        id: 'A',
        name: 'A栋教学楼',
        position: { x: -5, z: 0 },
        floors: [
          {
            index: 1,
            name: '1F',
            seats: [
              { id: 'A-1-1', x: 0, z: 0, status: 'free' },
              { id: 'A-1-2', x: 1, z: 0, status: 'booked' },
              // ...
            ]
          },
          {
            index: 2,
            name: '2F',
            seats: [/* ... */]
          }
        ]
      },
      {
        id: 'B',
        name: 'B栋图书馆',
        position: { x: 5, z: 0 },
        floors: [/* ... */]
      }
    ]
  },
  getters: {
    // 计算每栋楼使用率（用于给楼上色）
    buildingUsage: state => buildingId => {
      const b = state.buildings.find(b => b.id === buildingId);
      if (!b) return 0;
      const seats = b.floors.flatMap(f => f.seats);
      if (!seats.length) return 0;
      const used = seats.filter(s => s.status === 'booked').length;
      return used / seats.length;
    }
  },
  mutations: {
    updateSeatStatus(state, { seatId, status }) {
      state.buildings.forEach(b =>
        b.floors.forEach(f => {
          const seat = f.seats.find(s => s.id === seatId);
          if (seat) seat.status = status;
        })
      );
    }
  },
  actions: {
    bookSeat({ commit }, { seat, time }) {
      // TODO: 请求后端...
      console.log(`预约成功: 座位 ${seat.id}, 时间 ${time}`);
      commit('updateSeatStatus', { seatId: seat.id, status: 'booked' });
    }
  }
});
