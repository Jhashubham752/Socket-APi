const db = require('../models')

const Sequelize = require('sequelize');
const myFunction = require('./Function')
const Op = Sequelize.Op;
const helper = require('../config/helper')
module.exports = function (io) {

  io.on('connection', function (socket) {

    socket.on('connect_user', async function (connect_listener) {

      try {
        console.log("==========================socket_id", connect_listener.user_id)
        let check_user = await db.socketuser.findOne({

          where: {
            user_id: connect_listener.user_id
          }
        });
        console.log(check_user, "====================check user")

        if (check_user) {

          create_socket_user = await db.socketuser.update({
            isOnline: '1',
            socketId: socket.id,
          },
            {
              where: {
                user_id: connect_listener.user_id
              }
            }
          );

        } else {
          create_socket_user = await db.socketuser.create({
            user_id: connect_listener.user_id,
            socketId: socket.id,
            isOnline: '1'
          })
        }
        success_message = [];
        success_message = {
          'success_message': 'connected successfully'
        }
        socket.emit('connect_user', success_message);
      } catch (error) {
        throw error
      }
    });

    socket.on('send_message', async function (get_data) {

      console.log(get_data, "========================getdata")
      if (get_data.messageType == 1) { // media if messageType == 1 insert extention also
        extension_data = get_data.extension
        convert_image = await myFunction.image_base_64(get_data.message, extension_data);
        get_data.message = convert_image;
      }
      var chat_constantdata = await db.chatconstant.findOne({
        where: {

          [Op.or]: [
            {
              senderId: get_data.user1Id,
              receiverId: get_data.user2Id
            },
            {
              receiverId: get_data.user1Id,
              senderId: get_data.user2Id
            }
          ]
        }

      });
      //  console.log(chat_constantdata,"saBvghvaDVghadVghk");return;

      if (chat_constantdata) {
        console.log("================coming in second time")
        create_message = await db.messages.create({
          senderId: get_data.user1Id,
          receiverId: get_data.user2Id,
          messageType: get_data.messageType,
          message: get_data.message,
          chatConstantId: chat_constantdata.dataValues.id,
        })

        update_last_message = await db.chatconstant.update({

          lastMsgId: create_message.dataValues.id,

        },
          {
            where: {
              id: chat_constantdata.dataValues.id
            }
          }
        );
        getdata = await db.messages.findOne({
          attributes: ['id', 'createdAt', 'messageType', [Sequelize.literal('(SELECT name FROM user WHERE user.id  = messages.senderId)'), 'SenderName'], 'message',
            [Sequelize.literal('(SELECT id FROM user WHERE user.id  = messages.senderId)'), 'SenderID'],
            [Sequelize.literal('(SELECT image FROM user WHERE user.image = messages.senderId limit 1)'), 'SenderImage'],
            [Sequelize.literal('(SELECT name FROM user WHERE user.id  =  messages.receiverId)'), 'ReceiverName'],
            [Sequelize.literal('(SELECT id FROM user WHERE user.id  = messages.receiverId)'), 'ReceiverId'],
            [Sequelize.literal('(SELECT image FROM user WHERE user.image =  messages.receiverId limit 1)'), 'ReceiverImage'], 'messageType', 'createdAt'
          ],
          where: {
            id: create_message.dataValues.id
          }
        });
        // console.log(getdata.dataValues,"==================ssss");return;
        if (getdata) {
          get_id = await db.socketuser.findOne({
            where: {
              user_id: get_data.user2Id
            }
          });


          get_id2 = await db.socketuser.findOne({
            where: {
              user_id: get_data.user1Id
            },
            raw: true
          })

          // console.log(get_id.socketId, "-------------------------get_socket_id", get_id2.socketId);
          if (get_id) {
            // io.to(get_id2.socketId).emit('send_message', getdata);
            io.to(get_id.socketId).emit('sendMessage', getdata);
          }

          //Get user details //
          let getDeviceToken = await db.user.findOne({
            where: {
              id: get_data.user1Id
            }
          })

          //Send Push Notification

          // if(getDeviceToken.notificationOnOff == 1) {
          let message = getdata.message;
          if (getDeviceToken.deviceType == 0) {
            if (getDeviceToken.deviceToken != '') {
              let notification_data = {

                "lastMessage": message,
                // "chatConstantId": getdata.chatConstantId,
                "created_at": getdata.dataValues.createdAt,
                "userName": getdata.dataValues.SenderName,
                // "block_status": 0,
                "groupId": 0,
                // "id": getdata.id,
                "messageType": getdata.messageType,
                "receiverId": getdata.dataValues.ReceiverId,
                "senderId": getdata.dataValues.SenderID,
                "userImage": getdata.dataValues.SenderImage,
                "user_id": getdata.dataValues.ReceiverId
              };
              await helper.sendNotification(getDeviceToken.deviceToken, message, notification_type = 1, notification_data, isGroup = 0);
            }
          }
          // }
          socket.emit("sendMessage", getdata);
        }

      } else {
        console.log("coming here first time------------------>>")
        let create_last_message = await db.chatconstant.create({
          senderId: get_data.user1Id,
          receiverId: get_data.user2Id,
          lastMsgId: 0,
        });
        create_message = await db.messages.create({
          senderId: get_data.user1Id,
          receiverId: get_data.user2Id,
          messageType: get_data.messageType,
          message: get_data.message,
          chatConstantId: create_last_message.dataValues.id,

        });

        update_last_message = await db.chatconstant.update({

          lastMsgId: create_message.dataValues.id
        },
          {
            where: {
              id: create_last_message.dataValues.id
            }
          }
        );
        getdata = await db.messages.findOne({
          attributes: ['id',
            [Sequelize.literal('(SELECT name FROM user WHERE user.id  = messages.senderId)'), 'SenderName'], 'message',
            [Sequelize.literal('(SELECT id FROM user WHERE user.id  = messages.senderId)'), 'SenderID'],
            [Sequelize.literal('(SELECT image FROM user WHERE user.image  = messages.senderId)'), 'SenderImage'],
            [Sequelize.literal('(SELECT name FROM user WHERE user.id  =  messages.receiverId)'), 'ReceiverName'],
            [Sequelize.literal('(SELECT id FROM user WHERE user.id  = messages.receiverId)'), 'ReceiverId'],
            [Sequelize.literal('(SELECT image FROM user WHERE user.image = messages.receiverId)'), 'ReceiverImage'], , 'messageType', 'createdAt'
          ],
          where: {
            id: create_message.dataValues.id
          }
        });
        console.log(getdata.dataValues, "=============mydata")
        if (getdata) {

          get_id = await db.socketuser.findOne({
            where: {
              user_id: get_data.user2Id
            },
            raw: true
          });
          get_id2 = await db.socketuser.findOne({
            where: {
              user_id: get_data.user1Id
            },
            raw: true
          });
          console.log(get_id.socketId, "------------>>", get_id2.socketId);

          if (get_id) {
            let message = getdata.message;
            if (getDeviceToken.deviceType == 0) {
              if (getDeviceToken.deviceToken != '') {
                let notification_data = {

                  "lastMessage": message,
                  // "chatConstantId": getdata.chatConstantId,
                  "created_at": getdata.dataValues.createdAt,
                  "userName": getdata.dataValues.SenderName,
                  // "block_status": 0,
                  "groupId": 0,
                  // "id": getdata.id,
                  "messageType": getdata.messageType,
                  "receiverId": getdata.dataValues.ReceiverId,
                  "senderId": getdata.dataValues.SenderID,
                  "userImage": getdata.dataValues.SenderImage,
                  "user_id": getdata.dataValues.SenderID
                };
                await helper.sendNotification(getDeviceToken.deviceToken, message, notification_type = 1, notification_data);
              }
            }
            // io.to(get_id.socketId).emit('send_message', getdata);
            io.to(get_id.socketId).emit('sendMessage', getdata);


          }
          //socket.emit("send_message", getdata);
        }
      }

    });

    socket.on('get_message', async function (get_msg_data) {
      try {
        //console.log(get_msg_data,"--------------fwefew");return;
        let get_message = await myFunction.get_message(get_msg_data);
        console.log(get_message, "-----------------------------dfff")
        if (get_message.length > 0) {

          socket.emit('getMessage', get_message);

          get_id = await db.socketuser.findOne({
            where: {
              user_id: get_msg_data.user1Id
            },
            raw: true
          });
          get_id2 = await db.socketuser.findOne({
            where: {
              user_id: get_msg_data.user2Id
            },
            raw: true
          });
          console.log(get_id.socketId, "--------- get message socket --->>", get_id2.socketId);

          if (get_id) {

            io.to(get_id.socketId).emit('getMessage', get_message);
            io.to(get_id2.socketId).emit('getMessage', get_message);
          }
          // console.log('=========>',get_message);return

        } else {

          success_message = [];
          // success_message = {
          //   'success_message': 'Data Not Available'
          // }
          socket.emit('get_message', success_message);
        }
      } catch (error) {
        throw error
      }
    })

    socket.on('chat_listing', async function (chat_data) {

      try {

        var get_chat_listing = await myFunction.get_chat_listing(chat_data);
        // console.log(chat_data,"ghet_chat_listing");return
        if (get_chat_listing.length > 0) {

          console.log(get_chat_listing,'ssget_chat_listing ');
          socket.emit('chatListing', get_chat_listing);

        } else {

        //  success_message = [];
           success_message = {
            'success_message': 'Data Not Available'
          } 
         console.log(chat_data,"ghet_chat_listing");

          socket.emit('chatListing', success_message);

        }
      } catch (error) {
        throw error
      }
    })

    socket.on('read_unread', async function (get_read_status) {
      update_read_status = await db.messages.update({
        read_status: 1
      },
        {
          where: {
            senderId: get_read_status.user1Id,
            receiverId: get_read_status.user2Id
          }
        }
      );
      get_read_unread = {}
      get_read_unread.read_status = 1
      console.log(get_read_unread, '....get_read_unread ');
      socket.emit('readUnread', get_read_unread)

    });

    socket.on('delete_chat', async function (delete_chat) {
      try {

        await myFunction.delete_chat(delete_chat)
        success_message = []
        // success_message = {
        //   'success_message': 'Chat Deleted Successfully'
        // }

        socket.emit('deleteChat', success_message);

      } catch (error) {
        throw error
      }

    });
    socket.on("call_to_user", async function (call_data) {
      try {

        let call_to_user_data = await myFunction.call_connect(call_data);

        console.log(call_to_user_data);
        create_data = {
          'call_connect_status': call_to_user_data
        }

        console.log(create_data, "====data");
        socket.emit('call_to_user', create_data);

        get_reciever_data = await db.socketuser.findOne({

          where: {
            user_id: get_data.user1Id,
          }

        });

        console.log(get_reciever_data, '...');

        if (get_reciever_data.isOnline == 1) {
          console.log('sdfdsc');
          socket.to(get_reciever_data.dataValues.socketId).emit('call_to_user', create_data);
        }
      } catch (error) {
        throw error
      }
    });

    socket.on('disconnect_', async function () {

      await db.socketuser.update({
        isOnline: 0,
      },
        {
          where: {
            socketId: socket.id
          }
        }
      );

      console.log('socket user disconnected');
    });

  })
}