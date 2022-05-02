import { GiftedChat, Bubble, InputToolbar } from 'react-native-gifted-chat'
import React from 'react';
import { View, Platform, KeyboardAvoidingView } from 'react-native';

import firebase from "firebase";
import "firebase/firestore";

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import CustomActions from './CustomActions';
import MapView from "react-native-maps";

export default class Chat extends React.Component {
  constructor() {
    super();
    this.state = {
      messages: [],
      uid: 0,
      user: {
        _id: "",
        name: "",
        avatar: "",
      },
      isConnected: false,
      image: null,
      location: null,
    };

    //database info
    const firebaseConfig = {
      apiKey: "AIzaSyDayqHoiny3pi1WsdCv9OtETT6f_fZ-Fk4",
      authDomain: "chatapp-f3a4c.firebaseapp.com",
      projectId: "chatapp-f3a4c",
      storageBucket: "chatapp-f3a4c.appspot.com",
      messagingSenderId: "546580331538",
    };

    if (!firebase.apps.length) {
      firebase.initializeApp(firebaseConfig);
    }

    this.referenceChatMessages = firebase.firestore().collection("messages");
    this.refMsgsUser = null;
  }

  async getMessages() {
    let messages = '';
    try {
      messages = await AsyncStorage.getItem('messages') || [];
      this.setState({
        messages: JSON.parse(messages)
      });
    } catch (error) {
      console.log(error.message);
    }
  };

  async saveMessages() {
    try {
      await AsyncStorage.setItem('messages', JSON.stringify(this.state.messages));
    } catch (error) {
      console.log(error.message);
    }
  };

  async deleteMessages() {
    try {
      await AsyncStorage.removeItem('messages');
      this.setState({
        messages: []
      })
    } catch (error) {
      console.log(error.message);
    }
  }

  //Static messages
  componentDidMount() {
    const name = this.props.route.name;
    this.props.navigation.setOptions({ title: name });

    //info if user is offline or online
    NetInfo.fetch().then(connection => {
      if (connection.isConnected) {
        this.setState({ isConnected: true });
        console.log('online');

        this.unsubscribe = this.referenceChatMessages
          .orderBy("createdAt", "desc")
          .onSnapshot(this.onCollectionUpdate);

        this.authUnsubscribe = firebase.auth().onAuthStateChanged(async (user) => {
          if (!user) {
            await firebase.auth().signInAnonymously();
          }
          this.setState({
            uid: user.uid,
            messages: [],
            user: {
              _id: user.uid,
              name: name,
              avatar: "https://placeimg.com/140/140/any"
            }
          });
        });
        this.saveMessages();

      } else {
        this.setState({ isConnected: false });
        console.log('offline');
        this.getMessages();
      }
    });
  }

  onCollectionUpdate = (querySnapshot) => {
    const messages = [];
    querySnapshot.forEach((doc) => {
      let data = doc.data();
      messages.push({
        _id: data._id,
        text: data.text,
        createdAt: data.createdAt.toDate(),
        user: {
          _id: data.user._id,
          name: data.user.name,
          avatar: data.user.avatar
        },
        image: data.image || null,
        location: data.location || null,
      });
    });
    this.setState({
      messages: messages,
    });

    this.saveMessages();
  };

  addMessages() {
    const message = this.state.messages[0];
    this.referenceChatMessages.add({
      _id: message._id,
      createdAt: message.createdAt,
      text: message.text || "",
      user: this.state.user,
      image: message.image || "",
      location: message.location || null,
    });
  }

  onSend(messages = []) {
    this.setState((previousState) => ({
      messages: GiftedChat.append(previousState.messages, messages),
    }), () => {
      this.addMessages();
    });
  }

  // unsubscribing from collection updates
  componentWillUnmount() {
    if (this.state.isConnected) {
      this.authUnsubscribe();
      this.unsubscribe();
    }
  }

  renderInputToolbar(props) {
    if (this.state.isConnected == false) {
    } else {
      return (
        <InputToolbar
          {...props}
        />
      );
    }
  }

  renderBubble(props) {
    return (
      <Bubble
        {...props}
        wrapperStyle={{
          right: {
            backgroundColor: "#000",
          }
        }}
      />
    );
  }

  renderCustomView(props) {
    const { currentMessage } = props;
    if (currentMessage.location) {
      return (
        <MapView
          style={{
            width: 150,
            height: 100,
            borderRadius: 13,
            margin: 3
          }}
          region={{
            latitude: currentMessage.location.latitude,
            longitude: currentMessage.location.longitude,
            latitudeDelta: 0.0922,
            longitudeDelta: 0.0421,
          }}
        />
      );
    }
    return null;
  }

  renderCustomActions(props) {
    return <CustomActions {...props} />
  };

  render() {
    let name = this.props.route.params.name;
    this.props.navigation.setOptions({ title: name });
    const { bgColor } = this.props.route.params;
    return (
      <View style={{
        flex: 1, backgroundColor: bgColor ? bgColor : "#0b4bb3"
      }}>
        <GiftedChat
          renderBubble={this.renderBubble.bind(this)}
          renderInputToolbar={this.renderInputToolbar.bind(this)}
          messages={this.state.messages}
          onSend={(messages) => this.onSend(messages)}
          renderActions={this.renderCustomActions}
          renderCustomView={this.renderCustomView}
          user={{
            _id: 1,
          }}
        />
        {/*component for Android so that the input field won’t be hidden beneath the keyboard.*/}
        {Platform.OS === 'android' ? <KeyboardAvoidingView behavior="height" /> : null
        }
      </View>
    );
  }
}

