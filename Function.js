const db = require("../models");

const {Sequelize,QueryTypes}=require('sequelize');
// const {QueryTypes}=require('sequelize');
const Op = Sequelize.Op;
 const path=require('path')
 const fs=require('fs')
const { sequelize } = require("../models");
const database = require('../db/db.js');
module.exports={

  image_base_64: async function (get_message, extension_data) {
    var image = get_message
    var data = image.replace(/^data:image\/\w+;base64,/, '');
    
    var extension = extension_data;
    var filename = Math.floor(Date.now() / 1000) + '.' + extension;

    var base64Str = data;
   
    upload_path = path.join(__dirname, '../app/public/images/chatimages/' + filename);
    // console.log(upload_path);return
    if (extension) {
      fs.writeFile(upload_path, base64Str, {
        encoding: 'base64'  
      }, function (err) {
        if (err) {
          console.log(err)
        }
      })
    }
    return filename;
  },
 
    get_message: async function (get_msg_data) {
        get_user_status = await db.user.findOne({
          where: {
            id: get_msg_data.user1Id
          }
        });
       
        if (get_user_status.dataValues.status = 1) {
          
          get_messages_data = await db.messages.findAll({
              attributes: ['id','createdAt','messageType', 
            [Sequelize.literal('(SELECT name FROM user WHERE user.id  = messages.senderId)'), 'SenderName'], 'message',
            [Sequelize.literal('(SELECT id FROM user WHERE user.id  = messages.senderId)'), 'SenderID'],
            [Sequelize.literal('(SELECT image FROM user WHERE user.image = messages.senderId limit 1)'), 'SenderImage'],
            [Sequelize.literal('(SELECT name FROM user WHERE user.id  =  messages.receiverId)'), 'ReceiverName'],
            [Sequelize.literal('(SELECT id FROM user WHERE user.id  = messages.receiverId)'), 'ReceiverId'],
            [Sequelize.literal('(SELECT image FROM user WHERE user.image =  messages.receiverId limit 1)'), 'ReceiverImage'],'messageType', 'createdAt'
            ],
           
            where:{
              deletedId: {
                [Op.ne]:get_msg_data.user1Id
              },
              [Op.or]: [{
                senderId: get_msg_data.user1Id,
                receiverId: get_msg_data.user2Id
              },
              {
                receiverId: get_msg_data.user1Id,
                senderId: get_msg_data.user2Id
              }
    
            ],
           
            }
          });
        //  console.log(get_messages_data,"------------------------------------------>> get message ");return
         
          // var get_messages_data = await sequelize.query(`SELECT *,(select name from user where id =${get_msg_data.receiverId})as recieverName, ifnull((select image from user where id =${get_msg_data.receiverId}),'')as recieverImage,(select name from user where id =${get_msg_data.senderId})as senderName,ifnull((select image from user where id =${get_msg_data.senderId}),'')as senderImage FROM messages WHERE ((senderId=${get_msg_data.senderId} AND receiverId=${get_msg_data.receiverId}) OR (senderId=${get_msg_data.receiverId} AND receiverId=${get_msg_data.senderId})) order by id desc`, {
            
          //   model: db.messages,
          //   mapToModel: true,
          //   type: QueryTypes.SELECT
          // });
    
          // console.log('=========>',get_messages_data);return
          if (get_messages_data) {

            get_messages_data = get_messages_data.map(value => {
              return value.toJSON();
            });
          }else{
            get_messages_data=[]
          }
        //  console.log('=========>',get_messages_data,"-------------------ff");return
    
          return get_messages_data;
        }
      },

        get_chat_listing: async function (get_chat_data) {
        get_user_status = await db.user.findAll({
            where: {
                id: get_chat_data.user_id
            }
        });

     //   console.log(get_user_status);return 
        if (get_user_status) {
            var chat_data = await sequelize.query(`select *,
            (select Count(*) from messages where (receiverId=${get_chat_data.user_id} and senderId=user_id) and (readStatus=0) and deletedId!=${get_chat_data.user_id})

            as unreadcount  from (SELECT *,CASE WHEN senderId = ${get_chat_data.user_id} THEN receiverId WHEN receiverId = ${get_chat_data.user_id} THEN senderId  END AS user_id,
              (SELECT message FROM messages where id=lastMsgId ) as lastMessage ,
              (SELECT name FROM user where id=user_id) as name,
               ifnull((SELECT image FROM user where id=user_id),'') as userImage,
               (SELECT  createdAt FROM messages where id=lastMsgId order by id desc limit 1) as created_at ,
               (SELECT  messageType  FROM messages where id=lastMsgId order by id desc limit 1) as messageType, 
               
               ifnull((SELECT  isOnline  FROM socketuser where user_id=user_id order by id desc limit 1),0) as onlineStatus from chatconstant where (senderId=${get_chat_data.user_id} or receiverId=${get_chat_data.user_id}))tt where deletedId!=${get_chat_data.user_id} order by createdAt desc `, {
                model: db.messages,
                model: db.chatconstant,
                mapToModel: true,
                type: QueryTypes.SELECT
            });
                //  console.log('........done',chat_data);
            if (chat_data) {
              // return
                chat_data = chat_data.map(value => {
                    value = value.toJSON();
                    return value;
                });
            }
            // console.log(chat_data,'....................chattt'); return
            return chat_data;
        }
      },

      delete_chat: async function (get_delete_data) {
        get_delete_status = await db.messages.findAll({
          where: {
            // deletedId: {
            //   [Op.ne]:get_delete_data.user1Id
            // },
            deletedId: 0,
            [Op.or]: [
              { senderId: get_delete_data.user1Id, receiverId: get_delete_data.user2Id },
              { receiverId: get_delete_data.user1Id, senderId: get_delete_data.user2Id },
            ]
          }
        });
        if (get_delete_status) {
          get_delete_status = get_delete_status.map(value => {
            return value.toJSON();
          });
        }
        //  console.log(get_delete_status);return; 
    
        if (get_delete_status.length > 0) {

            delete_all_chat = await db.messages.update({
            deletedId: get_delete_data.user1Id
         },
            {
              where: {
                [Op.or]: [
                  { senderId: get_delete_data.user1Id, receiverId: get_delete_data.user2Id },
                  { receiverId: get_delete_data.user1Id, senderId: get_delete_data.user2Id }
                ]
              }
            }
          );

           await db.chatconstant.update({
            deletedId: get_delete_data.user1Id
         },
            {
              where: {
                [Op.or]: [
                  { senderId: get_delete_data.user1Id, receiverId: get_delete_data.user2Id },
                  { receiverId: get_delete_data.user1Id, senderId: get_delete_data.user2Id }
                ]
              }
            }
          );

          /*    console.log(update_delete_id, "update_delete_id") */
        } else {
          delete_all_chat = await db.messages.destroy({
            where: {
              [Op.or]: [
                { senderId: get_delete_data.user1Id, receiverId: get_delete_data.user2Id },
                { receiverId: get_delete_data.user1Id, senderId: get_delete_data.user2Id }
              ]
            }
          })

          await db.chatconstant.destroy({
            where: {
              [Op.or]: [
                { senderId: get_delete_data.user1Id, receiverId: get_delete_data.user2Id },
                { receiverId: get_delete_data.user1Id, senderId: get_delete_data.user2Id }
              ]
            }
          })
        }
        return delete_all_chat;
      },

    call_connect: async function (get_call_status_data) {

    get_call_status = await db.callhistory.findOne({
        where: {
            senderId: get_call_status_data.user1Id,
            receiverId: get_call_status_data.user2Id,
           
        },
        order: [
            ['id', 'DESC'],
        ],
        raw: true
        });
        console.log(get_call_status, "=========check");
        if (get_call_status) {
      
            update_call_status = await db.callhistory.update({
             callStatus: get_call_status_data.callStatus,
              },
                {
                  where: {
                    id: get_call_status.id
                  }
                }
            );
            return get_call_status_data.callStatus;

        } else {        
            return get_call_status_data.callStatus;
        }
    },
}