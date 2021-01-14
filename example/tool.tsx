import { atom, useCoiledState } from '../.';


const initState = atom<Record<string, any>>({
    key: 'model',
    default: {}
})

type State = typeof initState
type Action = {
    type: string,
    payload: any,
}

const reducer = (state: State, action: Action) => {
    const [, setState] = useCoiledState(initState)
    switch (action.type) {
      case 'QUERY_BOARD_DATA': {
        return {
          ...state,
          ...action.payload,
        };
      }
      default:
        return state;
    }
  };

const useDispatch = () => {
    const [, dispatch] = useCoiledState(initState)
    return dispatch;
}