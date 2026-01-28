import { useState, useEffect } from 'react'
import { Slider } from '@heroui/react'
import {
  dataControlOccupancyChannelId,
  clientVideoControlChannelId,
  serverVideoControlChannelId
} from '../data/constants'
import { PlayCircle } from './sideMenuIcons'

const Expand = props => {
  return (
    <svg
      aria-hidden='true'
      focusable='false'
      height='20'
      role='presentation'
      viewBox='0 0 20 20'
      width='20'
      {...props}
    >
      <path
        d='M13.825 6.91211L9.99999 10.7288L6.175 6.91211L5 8.08711L9.99999 13.0871L15 8.08711L13.825 6.91211Z'
        fill='currentColor'
      />
    </svg>
  )
}

export default function SideMenuDataControls ({
  chat,
  dataControlsDropDownVisible,
  setDataControlsDropDownVisible
}) {
  const [selectedSimulation, setSelectedSimulation] = useState(0)
  const simulationNames = [
    'Select',
    'Jordan 3 Super Bowl',
    'Jordan 3 Bio Beige',
    'Jordan 3 Tinker',
    'Air Max 1 Atmos',
    'Jordan 3 Seoul',
    'Off-White Jordan 1 UNC',
    'Fear of God 1',
    'LeBron 15 Diamond Turf',
    'Yeezy 2 Red October',
    'Featured Poll Start',
    'Featured Poll Results'
  ]
  const [occupancy, setOccupancy] = useState<number | number[]>(0)
  const [isStarted, setIsStarted] = useState(false)
  const [isChatPaused, setIsChatPaused] = useState(false)
  
  async function handleStartStopToggle() {
    if (isStarted) {
      // Stop simulation
      await chat.sdk.publish({
        message: { type: 'END_STREAM' },
        channel: serverVideoControlChannelId
      })
      setIsStarted(false)
    } else {
      // Start simulation
      await chat.sdk.publish({
        message: { type: 'START_STREAM' },
        channel: serverVideoControlChannelId
      })
      setIsStarted(true)
    }
  }
  
  async function handleChatToggle() {
    await chat.sdk.publish({
      message: { type: 'BOT_CHAT' },
      channel: serverVideoControlChannelId
    })
    setIsChatPaused(!isChatPaused)
  }
  
  async function sendMessageToBackend (simulate) {
    switch (simulate) {
      case 'Jordan 3 Super Bowl':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 105000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Jordan 3 Bio Beige':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 190000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Jordan 3 Tinker':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 250000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Air Max 1 Atmos':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 420000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Jordan 3 Seoul':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 540000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Off-White Jordan 1 UNC':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 660000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Fear of God 1':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 780000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'LeBron 15 Diamond Turf':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 900000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Yeezy 2 Red October':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 1080000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Featured Poll Start':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 60000 }
          },
          channel: serverVideoControlChannelId
        })
        break
      case 'Featured Poll Results':
        await chat.sdk.publish({
          message: {
            type: 'SEEK',
            params: { playbackTime: 1180000 }
          },
          channel: serverVideoControlChannelId
        })
        break
    }
  }

  useEffect(() => {
    async function sendControlMessage (liveStreamOccupancy, chatOccupancy) {
      if (chat) {
        await chat.sdk.publish({
          message: {
            streamOccupancy: `${liveStreamOccupancy}`,
            chatOccupancy: `${chatOccupancy}`,
            type: 'occupancyControl'
          },
          channel: dataControlOccupancyChannelId
        })
      }
    }
    const streamWidgetOccupancy =
      occupancy == 0 ? 0 : Math.round(Math.pow(Math.E, occupancy as number))
    const chatWidgetOccupancy =
      occupancy == 0
        ? 0
        : Math.round(Math.pow(Math.E, (occupancy as number) / 2))
    sendControlMessage(streamWidgetOccupancy, chatWidgetOccupancy)
  }, [occupancy])

  useEffect(() => {
    if (!chat) return
    const videoEventsChannel = chat.sdk.channel(clientVideoControlChannelId)
    const videoEventsSubscription = videoEventsChannel.subscription({
      receivePresenceEvents: false
    })
    videoEventsSubscription.onMessage = messageEvent => {
      if (messageEvent.message?.type === 'STATUS') {
        setIsStarted(true)
      }
    }
    videoEventsSubscription.subscribe()
  }, [chat])

  return (
    <div className='flex flex-col gap-3 text-base font-semibold'>
      {/* Start/Stop Toggle Button */}
      <div className='flex flex-row gap-2 h-11 items-center justify-between'>
        <div className=''>Control</div>
        <button
          onClick={handleStartStopToggle}
          className={`flex items-center justify-center gap-2 px-4 h-11 rounded-md font-semibold transition-colors ${
            isStarted 
              ? 'bg-complex-red text-white hover:bg-red-700' 
              : 'bg-green-600 text-white hover:bg-green-700'
          }`}
        >
          {isStarted ? 'Stop Simulation' : 'Start Simulation'}
        </button>
      </div>
      
      {/* Chat Pause/Resume Toggle Button */}
      <div className='flex flex-row gap-2 h-11 items-center justify-between'>
        <div className=''>Bot Chat</div>
        <button
          onClick={handleChatToggle}
          disabled={!isStarted}
          className={`flex items-center justify-center gap-2 px-4 h-11 rounded-md font-semibold transition-colors ${
            !isStarted
              ? 'bg-gray-500 text-gray-300 cursor-not-allowed'
              : isChatPaused 
                ? 'bg-yellow-600 text-white hover:bg-yellow-700' 
                : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isChatPaused ? 'Resume Chat' : 'Pause Chat'}
        </button>
      </div>
      
      <div className='flex flex-row gap-2 h-11 items-center justify-between'>
        <div className=''>Simulation</div>
        <div className='flex flex-col'>
          <div
            className='flex flex-row gap-1 items-center cursor-pointer border-1 border-complex-red rounded-md h-11 max-h-11 w-48 px-3'
            onClick={e => {
              setDataControlsDropDownVisible(!dataControlsDropDownVisible)
              e.stopPropagation()
            }}
          >
            <div
              className={`font-normal truncate text-ellipsis overflow-hidden ${
                selectedSimulation == 0 ? 'text-complex-gray' : 'text-complex-white'
              } grow`}
            >{`${
              selectedSimulation == 0
                ? 'Select'
                : `${simulationNames[selectedSimulation]}`
            }`}</div>
            <Expand />
          </div>
          <div className='relative'>
            <DataControlsDropDown
              dropDownVisible={dataControlsDropDownVisible}
              setDropDownVisible={setDataControlsDropDownVisible}
              simulationNames={simulationNames}
              onClickOption={selected => {
                setSelectedSimulation(selected)
              }}
              isStarted={isStarted}
            />
          </div>
        </div>
        <div
          className={`${
            selectedSimulation == 0 ? 'text-complex-gray' : 'text-complex-white'
          } cursor-pointer`}
          onClick={e => {
            sendMessageToBackend(`${simulationNames[selectedSimulation]}`)
            e.stopPropagation()
          }}
        >
          <PlayCircle />
        </div>
      </div>
      <div className='flex flex-row gap-4 h-11 items-center'>
        <div className=''>Occupancy</div>
        <Slider
          aria-label={'Occupancy slider'}
          color={'secondary'}
          size={'md'}
          classNames={{
            filler: 'bg-brandAccent3',
            track: 'bg-neutral200',
            thumb: ['bg-brandAccent3']
          }}
          defaultValue={0}
          maxValue={16}
          minValue={0}
          step={1}
          onChange={setOccupancy}
        />
      </div>
    </div>
  )
}
function DataControlsDropDown ({
  dropDownVisible,
  setDropDownVisible,
  simulationNames,
  onClickOption,
  isStarted
}) {
  return (
    <div
      className={`${
        !dropDownVisible && 'hidden'
      } absolute w-48 top-[8px] left-[0px] bg-navy900 border-1 border-white/20 rounded-lg shadow-xl select-none z-40`}
    >
      <div className='flex flex-col z-50 pt-2 text-neutral-50 text-sm max-h-[500px] overflow-auto'>
        {simulationNames.map(
          (name, index) =>
            index > 0 && (
              <div
                key={index}
                className={`h-11 px-4 py-3 font-normal ${
                  isStarted
                    ? 'hover:bg-navy800 cursor-pointer'
                    : 'text-navy400 cursor-not-allowed'
                }`}
                onClick={e => {
                  if (isStarted) {
                    onClickOption(index)
                    setDropDownVisible(false)
                  }
                  e.stopPropagation()
                }}
              >
                {name}
              </div>
            )
        )}
      </div>
    </div>
  )
}
